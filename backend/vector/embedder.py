from vertexai.language_models import TextEmbeddingModel

_model = None


def get_model():
    global _model
    if _model is None:
        _model = TextEmbeddingModel.from_pretrained("text-embedding-004")
    return _model


def get_embedding(text: str):
    model = get_model()
    result = model.get_embeddings([text])
    return result[0].values


def get_embeddings_batch(texts: list):
    model = get_model()
    results = model.get_embeddings(texts)
    return [r.values for r in results]


def entity_to_text(conn, entity_id: int) -> str:
    """
    Converts an entity row into a single string for embedding.
    Joins expertise tags from normalized tables.
    """
    entity = conn.execute("SELECT * FROM entities WHERE id = ?", [entity_id]).fetchone()

    if not entity:
        return ""

    tags = conn.execute(
        """
        SELECT et.name
        FROM expertise_tags et
        JOIN entity_expertise ee ON et.id = ee.tag_id
        WHERE ee.entity_id = ?
    """,
        [entity_id],
    ).fetchall()

    tag_names = " ".join(t["name"] for t in tags)

    parts = [
        entity["name"] or "",
        entity["role"] or "",
        entity["industry"] or "",
        entity["description"] or "",
        tag_names,
        entity["stage"] or "",
        entity["country"] or "",
        entity["timezone"] or "",
    ]
    return " ".join(p for p in parts if p.strip())


def campaign_to_text(conn, campaign_id: int) -> str:
    """
    Converts a campaign row into a single string for embedding.

    ── CAMPAIGN TABLE FIELDS (update once table is finalized) ──
    Expected columns:
        id, company_id, title, description, industry, stage,
        timezone, country, target_audience, resources_provided,
        constraints, status, created_at, updated_at
    """
    campaign = conn.execute(
        "SELECT * FROM campaigns WHERE id = ?", [campaign_id]
    ).fetchone()

    if not campaign:
        return ""

    # TODO: Update these field names once campaign table is finalized
    parts = [
        campaign["title"] or "",
        campaign["description"] or "",
        campaign["industry"] or "",
        campaign["target_audience"] or "",
        campaign["resources_provided"] or "",
        campaign["constraints"] or "",
        campaign["stage"] or "",
        campaign["country"] or "",
    ]
    return " ".join(p for p in parts if p.strip())
