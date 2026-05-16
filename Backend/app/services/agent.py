from __future__ import annotations

import json
import os
from urllib.parse import urlencode

import google.generativeai as genai
from sqlalchemy.orm import Session

from app.services.relationship_search import RelationshipSearchPlan, run_relationship_search


AGENT_MODEL = os.getenv("AGENT_MODEL", os.getenv("RANK_MODEL", "gemini-2.5-flash-lite"))

SYSTEM_PROMPT = """
You are the master agent for an innovation ecosystem website. Decide whether a user message needs searchable ecosystem data.
Return JSON only.

Schema:
{
  "action": "answer" | "search",
  "message": "short user-facing response",
  "relationship_plan": {
    "source_name": string|null,
    "target_name": string|null,
    "source_role": string|null,
    "target_role": string|null,
    "relationship_type": string|null,
    "expertise": string|null,
    "count_only": boolean
  }
}

Use action=search for questions about entities, companies, mentors, investors, investments, relationships, expertise, counts, matching, or ecosystem search results.
Use action=answer for general product/help questions that do not need data lookup.
Known relationship_type codes: MENTORSHIP, SERVICE_BENEFIT, PROGRAMME_ASSIGNMENT, PARTNER_INITIATIVE, INVESTMENT_INTEREST, INVESTED_IN.
Map completed investment wording to INVESTED_IN. Map potential investor interest to INVESTMENT_INTEREST.
Roles include STARTUP, COMPANY, MENTOR, INVESTOR, SERVICE_PROVIDER, PROGRAMME, PARTNER, INNOVATOR.
""".strip()


def _get_model():
    api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
    if api_key:
        genai.configure(api_key=api_key)
    return genai.GenerativeModel(AGENT_MODEL)


def _extract_json(text: str) -> dict:
    raw = text.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return json.loads(raw.strip())


def classify_message(message: str) -> dict:
    model = _get_model()
    response = model.generate_content(f"{SYSTEM_PROMPT}\n\nUser message: {message}")
    return _extract_json(response.text)


def search_response(db: Session, message: str, entity_id: int | None = None) -> dict:
    classification = classify_message(message)
    action = classification.get("action", "answer")

    if action != "search":
        return {
            "action": "answer",
            "message": classification.get("message") or "I can help search the ecosystem or answer questions about it.",
        }

    relationship_plan = RelationshipSearchPlan(**(classification.get("relationship_plan") or {}))
    sql_results = run_relationship_search(db, relationship_plan)
    params = {"q": message}
    if entity_id is not None:
        params["entity_id"] = str(entity_id)

    return {
        "action": "search",
        "message": classification.get("message") or "I’ll search the ecosystem for that.",
        "redirect_url": f"/search?{urlencode(params)}",
        "sql_results": sql_results,
    }
