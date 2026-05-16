import json
from vertexai.generative_models import GenerativeModel
from vector.prompts import rerank_prompt
from vector.db import get_db_conn

_model = None

def get_model():
    global _model
    if _model is None:
        _model = GenerativeModel("gemini-2.5-flash-lite")
    return _model

def _get_relationship_context(conn, startup_id: int, candidate_id: int) -> str:
    """
    existing relationship between startup and candidate
    """
    try:
        rels = conn.execute("""
            SELECT r.status, r.strength_score, r.ai_reasoning_summary,
                   rt.name as rel_type
            FROM relationships r
            LEFT JOIN relationship_types rt ON r.relationship_type_id = rt.id
            WHERE (r.source_entity_id = ? AND r.target_entity_id = ?)
               OR (r.source_entity_id = ? AND r.target_entity_id = ?)
        """, [startup_id, candidate_id, candidate_id, startup_id]).fetchall()

        if not rels:
            return ""

        parts = []
        for r in rels:
            parts.append(f"[Existing {r['rel_type'] or 'relationship'}: status={r['status']}]")
        return " ".join(parts)
    except Exception:
        return ""


def _get_candidate_stats(conn, candidate_id: int) -> str:
    try:
        stats = conn.execute("""
            SELECT COUNT(*) as total_rels,
                   SUM(CASE WHEN r.status = 'COMPLETED' THEN 1 ELSE 0 END) as completed,
                   SUM(CASE WHEN r.status = 'ACTIVE' THEN 1 ELSE 0 END) as active
            FROM relationships r
            WHERE r.source_entity_id = ? OR r.target_entity_id = ?
        """, [candidate_id, candidate_id]).fetchone()

        avg_rating = conn.execute("""
            SELECT AVG(f.rating) as avg_rating, COUNT(f.id) as review_count
            FROM feedback f
            JOIN relationships r ON f.relationship_id = r.id
            WHERE r.source_entity_id = ? OR r.target_entity_id = ?
        """, [candidate_id, candidate_id]).fetchone()

        parts = []
        if stats and stats["total_rels"] > 0:
            parts.append(f"Past relationships: {stats['total_rels']} (active: {stats['active']}, completed: {stats['completed']})")
        if avg_rating and avg_rating["avg_rating"]:
            parts.append(f"Avg rating: {avg_rating['avg_rating']:.1f}/5 ({avg_rating['review_count']} reviews)")

        return " | ".join(parts) if parts else "No history"
    except Exception:
        return "No history"


def _build_candidate_text(candidate: dict, index: int, rel_context: str, stats: str, expertise_tags: str) -> str:
    line = (
        f"{index}. [{candidate.get('role', '')}] {candidate.get('name', '')} | "
        f"Industry: {candidate.get('industry', '')} | "
        f"Description: {candidate.get('description', '')} | "
        f"Expertise: {expertise_tags} | "
        f"History: {stats}"
    )
    if rel_context:
        line += f" | {rel_context}"
    return line


def rerank(query: str, candidates: list[dict], requester_id: int = None, top_k: int = 5):
    if not candidates:
        return []

    conn = get_db_conn()

    candidate_lines = []
    for i, c in enumerate(candidates):
        tags = conn.execute("""
            SELECT et.name FROM expertise_tags et
            JOIN entity_expertise ee ON et.id = ee.tag_id
            WHERE ee.entity_id = ?
        """, [c["id"]]).fetchall()
        expertise_tags = ", ".join(t["name"] for t in tags) or "N/A"

        rel_context = _get_relationship_context(conn, requester_id, c["id"]) if requester_id else ""
        stats = _get_candidate_stats(conn, c["id"])

        line = _build_candidate_text(c, i + 1, rel_context, stats, expertise_tags)
        candidate_lines.append(line)

    conn.close()

    candidates_text = "\n".join(candidate_lines)

    startup_context = ""
    if requester_id:
        conn2 = get_db_conn()
        requester = conn2.execute("SELECT name, role, industry, stage, description FROM entities WHERE id = ?", [requester_id]).fetchone()
        if requester:
            startup_context = f"{requester['name']} ({requester['role']}, {requester['industry']}, {requester['stage']}) — {requester['description']}"
        conn2.close()

    prompt = rerank_prompt(query, candidates_text, startup_context)

    model = get_model()
    response = model.generate_content(prompt)

    try:
        raw_text = response.text.strip()
        if raw_text.startswith("```"):
            raw_text = raw_text.split("```")[1]
            if raw_text.startswith("json"):
                raw_text = raw_text[4:]
        result = json.loads(raw_text.strip())
    except Exception as e:
        for c in candidates[:top_k]:
            c["reasoning"] = f"Reranking unavailable: {e}"
        return candidates[:top_k]

    ranked_items = result.get("ranked", [])
    reordered = []
    for item in ranked_items:
        pos = item.get("position", 0) - 1
        if 0 <= pos < len(candidates):
            candidate = dict(candidates[pos])
            candidate["reasoning"] = item.get("reasoning", "")
            reordered.append(candidate)

    return reordered[:top_k]
