import json
from vector.db import get_db_conn
from vector.embedder import get_embedding, entity_to_text, campaign_to_text

# -- 5 Roles --
# STARTUP - seeks mentors, investors, campaigns
# MENTOR - seeks startups, campaigns
# COMPANY - creates campaigns, seeks innovators/startups for them
# INNOVATOR - seeks startups (to join), campaigns
# INVESTOR - seeks startups, campaigns

ALL_ROLES = ("STARTUP", "MENTOR", "COMPANY", "INNOVATOR", "INVESTOR")

# Who can search for who
# "entities" = target entity roles to search
# "campaigns" = whether to also search the campaigns table
MATCH_TARGETS = {
    "STARTUP":   {"entities": ["MENTOR", "INVESTOR"], "campaigns": True},
    "MENTOR":    {"entities": ["STARTUP"], "campaigns": True},
    "COMPANY":   {"entities": ["INNOVATOR", "STARTUP"], "campaigns": False},
    "INNOVATOR": {"entities": ["STARTUP"], "campaigns": True},
    "INVESTOR":  {"entities": ["STARTUP"], "campaigns": True},
}

ANN_CAP = 20  # max candidates per category to pass to reranker


# -- Main Matching Function --

def match_for_entity(entity_id: int, campaign_id: int = None, top_k: int = 3):
    """
    Universal matching function.

    - entity_id: the person searching
    - campaign_id: (optional) if a COMPANY is searching for its campaign,
                   the query is built from the campaign instead of the company profile
    - top_k: how many final results per category (after reranking)

    Returns: { "mentors": [...], "startups": [...], "campaigns": [...], ... }
    """
    from vector.reranker import rerank

    conn = get_db_conn()

    entity = conn.execute("SELECT * FROM entities WHERE id = ?", [entity_id]).fetchone()
    if not entity:
        conn.close()
        return {}

    role = entity["role"]
    targets = MATCH_TARGETS.get(role)
    if not targets:
        conn.close()
        return {}

    if campaign_id:
        query_text = campaign_to_text(conn, campaign_id)
    else:
        query_text = entity_to_text(conn, entity_id)

    if not query_text.strip():
        conn.close()
        return {}

    conn.close()

    results = {}

    # Search target entity roles
    for target_role in targets["entities"]:
        raw = _search_entities(
            query_text=query_text,
            role_filter=[target_role],
            top_k=ANN_CAP,
        )
        reranked = rerank(query_text, raw, requester_id=entity_id, top_k=top_k)
        key = target_role.lower() + "s"  # "MENTOR" → "mentors"
        results[key] = reranked

    # Search campaigns
    if targets["campaigns"]:
        raw = _search_campaigns(
            query_text=query_text,
            top_k=ANN_CAP,
        )
        reranked = rerank(query_text, raw, requester_id=entity_id, top_k=top_k)
        results["campaigns"] = reranked

    return results


# -- Search Bar Function --

def search(query: str, entity_id: int = None, top_k: int = 1):
    """
    Search bar — user types a query, gets AI suggestions + vector results.

    - query: what user typed
    - entity_id: (optional) who is searching, for personalized AI suggestions
    - top_k: max AI suggestions

    Returns:
      {
        "ai_suggested": [...], 
        "results": [...] 
      }
    """
    from vector.reranker import rerank

    MAX_DISTANCE = 1.2  # above this = irrelevant, discard

    # (no role filter)
    entity_results = _search_entities(
        query_text=query,
        role_filter=None,
        top_k=50,
    )
    campaign_results = _search_campaigns(
        query_text=query,
        top_k=20,
    )

    if entity_id:
        entity_results = [r for r in entity_results if r["id"] != entity_id]

    all_results = entity_results + campaign_results
    all_results = [r for r in all_results if r["distance"] <= MAX_DISTANCE]
    all_results.sort(key=lambda x: x["distance"])

    # AI Suggested
    ai_suggested = []
    if entity_id and all_results:
        ai_suggested = rerank(
            query,
            all_results[:ANN_CAP],
            requester_id=entity_id,
            top_k=top_k,
            mode="search",
        )

    # remove Ai suggested from vector results
    ai_ids = set()
    for r in ai_suggested:
        key = (r.get("match_type", "entity"), r["id"])
        ai_ids.add(key)

    results = [
        r for r in all_results
        if (r.get("match_type", "entity"), r["id"]) not in ai_ids
    ]

    return {
        "ai_suggested": ai_suggested,
        "results": results,
    }


# -- Embedding Functions --

def embed_entity(entity_id: int):
    conn = get_db_conn()
    entity = conn.execute(
        "SELECT id, name, role FROM entities WHERE id = ?", [entity_id]
    ).fetchone()

    if not entity:
        conn.close()
        return

    text = entity_to_text(conn, entity_id)
    if not text.strip():
        conn.close()
        return

    vector = get_embedding(text)

    conn.execute("DELETE FROM vec_entities WHERE rowid = ?", [entity_id])
    conn.execute(
        "INSERT INTO vec_entities(rowid, embedding) VALUES (?, ?)",
        [entity_id, json.dumps(vector)]
    )
    conn.commit()
    conn.close()


def embed_campaign(campaign_id: int):
    """Embed a single campaign. Call after a company creates/updates a campaign."""
    conn = get_db_conn()
    text = campaign_to_text(conn, campaign_id)
    if not text.strip():
        conn.close()
        return

    vector = get_embedding(text)

    conn.execute("DELETE FROM vec_campaigns WHERE rowid = ?", [campaign_id])
    conn.execute(
        "INSERT INTO vec_campaigns(rowid, embedding) VALUES (?, ?)",
        [campaign_id, json.dumps(vector)]
    )
    conn.commit()
    conn.close()


def embed_all_entities():
    from vector.embedder import get_embeddings_batch

    conn = get_db_conn()
    role_placeholders = ",".join("?" * len(ALL_ROLES))
    entities = conn.execute(
        f"SELECT id, name, role FROM entities WHERE role IN ({role_placeholders})",
        list(ALL_ROLES)
    ).fetchall()
    entities = [dict(e) for e in entities]

    if not entities:
        print("No entities found to embed")
        conn.close()
        return

    print(f"Embedding {len(entities)} entities...")
    texts = [entity_to_text(conn, e["id"]) for e in entities]

    chunk_size = 100
    all_vectors = []
    for i in range(0, len(texts), chunk_size):
        chunk = texts[i:i + chunk_size]
        print(f"  Batch {i // chunk_size + 1} ({len(chunk)} entities)...")
        vectors = get_embeddings_batch(chunk)
        all_vectors.extend(vectors)

    for entity, vector in zip(entities, all_vectors):
        conn.execute("DELETE FROM vec_entities WHERE rowid = ?", [entity["id"]])
        conn.execute(
            "INSERT INTO vec_entities(rowid, embedding) VALUES (?, ?)",
            [entity["id"], json.dumps(vector)]
        )

    conn.commit()
    conn.close()
    print(f"{len(entities)} entities embedded")


def embed_all_campaigns():
    """Embed all active campaigns. Call on startup or after bulk import."""
    from vector.embedder import get_embeddings_batch

    conn = get_db_conn()
    try:
        campaigns = conn.execute(
            "SELECT id, title FROM campaigns WHERE status = 'ACTIVE'"
        ).fetchall()
    except Exception:
        # campaigns table may not exist yet
        print("Campaigns table not found, skipping campaign embedding")
        conn.close()
        return

    campaigns = [dict(c) for c in campaigns]

    if not campaigns:
        print("No active campaigns to embed")
        conn.close()
        return

    print(f"Embedding {len(campaigns)} campaigns...")
    texts = [campaign_to_text(conn, c["id"]) for c in campaigns]

    chunk_size = 100
    all_vectors = []
    for i in range(0, len(texts), chunk_size):
        chunk = texts[i:i + chunk_size]
        vectors = get_embeddings_batch(chunk)
        all_vectors.extend(vectors)

    for campaign, vector in zip(campaigns, all_vectors):
        conn.execute("DELETE FROM vec_campaigns WHERE rowid = ?", [campaign["id"]])
        conn.execute(
            "INSERT INTO vec_campaigns(rowid, embedding) VALUES (?, ?)",
            [campaign["id"], json.dumps(vector)]
        )

    conn.commit()
    conn.close()
    print(f"{len(campaigns)} campaigns embedded")


# -- Internal Search Functions --

def _search_entities(
    query_text: str,
    role_filter: list = None,
    candidate_pool: int = 100,
    top_k: int = 20,
):
    """ANN search against vec_entities → filter against entities table."""
    conn = get_db_conn()
    query_vector = get_embedding(query_text)

    raw = conn.execute("""
        SELECT rowid, distance
        FROM vec_entities
        WHERE embedding MATCH ?
          AND k = ?
        ORDER BY distance
    """, [json.dumps(query_vector), candidate_pool]).fetchall()

    if not raw:
        conn.close()
        return []

    ids = [r["rowid"] for r in raw]
    distances = {r["rowid"]: r["distance"] for r in raw}
    placeholders = ",".join("?" * len(ids))
    params = list(ids)

    # Hard metadata filters
    filters = []
    if role_filter:
        role_ph = ",".join("?" * len(role_filter))
        filters.append(f"role IN ({role_ph})")
        params.extend(role_filter)

    where_clause = ""
    if filters:
        where_clause = "AND " + " AND ".join(filters)

    results = conn.execute(f"""
        SELECT * FROM entities
        WHERE id IN ({placeholders})
        {where_clause}
    """, params).fetchall()
    conn.close()

    result_dicts = []
    for r in results:
        d = dict(r)
        d["distance"] = distances.get(r["id"], 9999)
        d["match_type"] = "entity"
        result_dicts.append(d)

    result_dicts.sort(key=lambda x: x["distance"])
    return result_dicts[:top_k]


def _search_campaigns(
    query_text: str,
    candidate_pool: int = 100,
    top_k: int = 20,
):
    """
    ANN search against vec_campaigns → filter against campaigns table.

    ── CAMPAIGN TABLE (update once finalized) ──
    Expected: id, company_id, title, description, industry, stage,
              timezone, country, target_audience, resources_provided,
              constraints, status, created_at, updated_at
    """
    conn = get_db_conn()

    # Check if campaigns table exists
    table_check = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='campaigns'"
    ).fetchone()
    if not table_check:
        conn.close()
        return []

    query_vector = get_embedding(query_text)

    raw = conn.execute("""
        SELECT rowid, distance
        FROM vec_campaigns
        WHERE embedding MATCH ?
          AND k = ?
        ORDER BY distance
    """, [json.dumps(query_vector), candidate_pool]).fetchall()

    if not raw:
        conn.close()
        return []

    ids = [r["rowid"] for r in raw]
    distances = {r["rowid"]: r["distance"] for r in raw}
    placeholders = ",".join("?" * len(ids))

    # TODO: Add hard filters (industry, stage, country) once campaign table is finalized
    results = conn.execute(f"""
        SELECT * FROM campaigns
        WHERE id IN ({placeholders})
          AND status = 'ACTIVE'
    """, list(ids)).fetchall()
    conn.close()

    result_dicts = []
    for r in results:
        d = dict(r)
        d["distance"] = distances.get(r["id"], 9999)
        d["match_type"] = "campaign"
        result_dicts.append(d)

    result_dicts.sort(key=lambda x: x["distance"])
    return result_dicts[:top_k]