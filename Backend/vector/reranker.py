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


def _get_direct_history(conn, requester_id: int, candidate_id: int) -> str:
    try:
        rels = conn.execute("""
            SELECT r.id, r.status, r.strength_score, r.ai_reasoning_summary,
                   rt.name as rel_type
            FROM relationships r
            LEFT JOIN relationship_types rt ON r.relationship_type_id = rt.id
            WHERE (r.source_entity_id = ? AND r.target_entity_id = ?)
               OR (r.source_entity_id = ? AND r.target_entity_id = ?)
        """, [requester_id, candidate_id, candidate_id, requester_id]).fetchall()

        if not rels:
            return "No direct history with requester."

        parts = []
        for r in rels:
            rel_type = r["rel_type"] or "relationship"
            line = f"  - {rel_type} ({r['status']})"
            if r["strength_score"]:
                line += f" | strength: {r['strength_score']:.0%}"

            # Get feedback for this specific relationship
            feedback = conn.execute("""
                SELECT f.rating, f.text_feedback, e.name as from_name
                FROM feedback f
                LEFT JOIN entities e ON f.from_entity_id = e.id
                WHERE f.relationship_id = ?
            """, [r["id"]]).fetchall()

            for fb in feedback:
                line += f'\n    Review ({fb["rating"]}/5 by {fb["from_name"]}): "{fb["text_feedback"]}"'

            parts.append(line)

        return "\n".join(parts)
    except Exception:
        return "No direct history with requester."


def _get_external_track_record(conn, requester_id: int, candidate_id: int) -> str:
    try:
        rels = conn.execute("""
            SELECT r.id, r.status, r.strength_score,
                   rt.name as rel_type,
                   e_other.name as other_entity_name
            FROM relationships r
            LEFT JOIN relationship_types rt ON r.relationship_type_id = rt.id
            LEFT JOIN entities e_other ON (
                CASE
                    WHEN r.source_entity_id = ? THEN r.target_entity_id
                    ELSE r.source_entity_id
                END = e_other.id
            )
            WHERE (r.source_entity_id = ? OR r.target_entity_id = ?)
              AND NOT (
                (r.source_entity_id = ? AND r.target_entity_id = ?)
                OR (r.source_entity_id = ? AND r.target_entity_id = ?)
              )
        """, [candidate_id,
              candidate_id, candidate_id,
              requester_id, candidate_id,
              candidate_id, requester_id]).fetchall()

        if not rels:
            return "No external track record."

        parts = []
        for r in rels:
            rel_type = r["rel_type"] or "relationship"
            other = r["other_entity_name"] or "unknown"
            line = f"  - {rel_type} with {other} ({r['status']})"

            # Get feedback for this relationship
            feedback = conn.execute("""
                SELECT f.rating, f.text_feedback, e.name as from_name
                FROM feedback f
                LEFT JOIN entities e ON f.from_entity_id = e.id
                WHERE f.relationship_id = ?
            """, [r["id"]]).fetchall()

            for fb in feedback:
                line += f'\n    Review ({fb["rating"]}/5 by {fb["from_name"]}): "{fb["text_feedback"]}"'

            parts.append(line)

        # Add aggregate stats
        avg = conn.execute("""
            SELECT AVG(f.rating) as avg, COUNT(f.id) as cnt
            FROM feedback f
            JOIN relationships r ON f.relationship_id = r.id
            WHERE r.source_entity_id = ? OR r.target_entity_id = ?
        """, [candidate_id, candidate_id]).fetchone()

        summary = ""
        if avg and avg["avg"]:
            summary = f"  Overall: {avg['avg']:.1f}/5 avg across {avg['cnt']} reviews"

        return "\n".join(parts) + ("\n" + summary if summary else "")
    except Exception:
        return "No external track record."


def _build_candidate_text(candidate: dict, index: int,
                          direct_history: str, external_record: str,
                          expertise_tags: str) -> str:
    return (
        f"--- Candidate {index} ---\n"
        f"[{candidate.get('role', '')}] {candidate.get('name', '')}\n"
        f"Industry: {candidate.get('industry', '')} | "
        f"Stage: {candidate.get('stage', '')} | "
        f"Country: {candidate.get('country', '')}\n"
        f"Description: {candidate.get('description', '')}\n"
        f"Expertise: {expertise_tags}\n"
        f"DIRECT HISTORY (with the requester):\n{direct_history}\n"
        f"EXTERNAL TRACK RECORD (with other entities):\n{external_record}\n"
    )

def rerank(query: str, candidates: list[dict], requester_id: int = None, top_k: int = 5):
    if not candidates:
        return []

    conn = get_db_conn()

    # Hard-exclude candidates with ACTIVE relationships (code enforced, not LLM)
    filtered_candidates = []
    for c in candidates:
        if requester_id:
            try:
                active = conn.execute("""
                    SELECT COUNT(*) as cnt FROM relationships
                    WHERE status = 'ACTIVE'
                      AND ((source_entity_id = ? AND target_entity_id = ?)
                        OR (source_entity_id = ? AND target_entity_id = ?))
                """, [requester_id, c["id"], c["id"], requester_id]).fetchone()
                if active and active["cnt"] > 0:
                    print(f"  Excluded {c.get('name', c['id'])} (ACTIVE relationship)")
                    continue
            except Exception:
                pass
        filtered_candidates.append(c)

    if not filtered_candidates:
        conn.close()
        return []

    # Build enriched candidate text for the prompt
    candidate_lines = []
    for i, c in enumerate(filtered_candidates):
        tags = conn.execute("""
            SELECT et.name FROM expertise_tags et
            JOIN entity_expertise ee ON et.id = ee.tag_id
            WHERE ee.entity_id = ?
        """, [c["id"]]).fetchall()
        expertise_tags = ", ".join(t["name"] for t in tags) or "N/A"

        direct = _get_direct_history(conn, requester_id, c["id"]) if requester_id else "N/A"
        external = _get_external_track_record(conn, requester_id, c["id"]) if requester_id else "N/A"

        line = _build_candidate_text(c, i + 1, direct, external, expertise_tags)
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
        for c in filtered_candidates[:top_k]:
            c["reasoning"] = f"Reranking unavailable: {e}"
        return filtered_candidates[:top_k]

    ranked_items = result.get("ranked", [])
    reordered = []
    for item in ranked_items:
        pos = item.get("position", 0) - 1
        if 0 <= pos < len(filtered_candidates):
            candidate = dict(filtered_candidates[pos])
            candidate["reasoning"] = item.get("reasoning", "")
            reordered.append(candidate)

    return reordered[:top_k]
