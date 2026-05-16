import json
import os
from typing import Any, Literal
from urllib.parse import urlencode

from pydantic import BaseModel, Field, ValidationError, field_validator

ALLOWED_ACTIONS = {"search_redirect", "answer_directly", "clarify"}
ALLOWED_FILTERS = {
    "source_name",
    "source_role",
    "target_name",
    "target_role",
    "relationship_type",
    "status",
    "industry",
    "stage",
    "country",
}
ALLOWED_ROLES = {
    "STARTUP",
    "COMPANY",
    "MENTOR",
    "INVESTOR",
    "SERVICE_PROVIDER",
    "PROGRAMME",
    "PARTNER",
    "INNOVATOR",
}
ALLOWED_RELATIONSHIP_TYPES = {
    "MENTORSHIP",
    "SERVICE_BENEFIT",
    "PROGRAMME_ASSIGNMENT",
    "PARTNER_INITIATIVE",
    "INVESTMENT_INTEREST",
    "INVESTED_IN",
}
ALLOWED_STATUSES = {"PROPOSED", "PENDING", "ACTIVE", "COMPLETED", "REJECTED"}


class AgentRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)


class AgentResponse(BaseModel):
    action: Literal["search_redirect", "answer_directly", "clarify"]
    message: str
    redirect_url: str | None = None
    filters: dict[str, str] = Field(default_factory=dict)


class LlmPlan(BaseModel):
    action: Literal["search_redirect", "answer_directly", "clarify"]
    message: str = ""
    filters: dict[str, str] = Field(default_factory=dict)

    @field_validator("filters")
    @classmethod
    def validate_filters(cls, filters: dict[str, Any]) -> dict[str, str]:
        clean: dict[str, str] = {}
        for key, value in filters.items():
            if key not in ALLOWED_FILTERS or value is None:
                continue
            text_value = str(value).strip()
            if not text_value:
                continue
            if key in {"source_role", "target_role"}:
                text_value = text_value.upper()
                if text_value not in ALLOWED_ROLES:
                    continue
            if key == "relationship_type":
                text_value = text_value.upper()
                if text_value not in ALLOWED_RELATIONSHIP_TYPES:
                    continue
            if key == "status":
                text_value = text_value.upper()
                if text_value not in ALLOWED_STATUSES:
                    continue
            clean[key] = text_value[:200]
        return clean


def _extract_json(raw_text: str) -> dict[str, Any]:
    text = raw_text.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.lower().startswith("json"):
            text = text[4:].strip()
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end < start:
        raise ValueError("LLM did not return a JSON object")
    return json.loads(text[start : end + 1])


def _model_name() -> str:
    return os.getenv("GEMINI_MODEL", "gemini-2.5-flash")


def _build_prompt(message: str) -> str:
    return f"""
You are the master AI agent for an innovation ecosystem relationship graph.
You may call a SQL/search subagent when the user asks to find, list, filter, or search records.
The SQL/search subagent must NOT output raw SQL. It must output validated JSON filters for the backend ORM.

Return exactly one JSON object with this schema:
{{
  "action": "search_redirect" | "answer_directly" | "clarify",
  "message": "short user-facing response",
  "filters": {{
    "source_name": "optional entity/person/org name",
    "source_role": "optional one of STARTUP, COMPANY, MENTOR, INVESTOR, SERVICE_PROVIDER, PROGRAMME, PARTNER, INNOVATOR",
    "target_name": "optional entity/person/org name",
    "target_role": "optional one of STARTUP, COMPANY, MENTOR, INVESTOR, SERVICE_PROVIDER, PROGRAMME, PARTNER, INNOVATOR",
    "relationship_type": "optional one of MENTORSHIP, SERVICE_BENEFIT, PROGRAMME_ASSIGNMENT, PARTNER_INITIATIVE, INVESTMENT_INTEREST, INVESTED_IN",
    "status": "optional one of PROPOSED, PENDING, ACTIVE, COMPLETED, REJECTED",
    "industry": "optional industry filter",
    "stage": "optional stage filter",
    "country": "optional country filter"
  }}
}}

Decision rules:
- Use action "search_redirect" when the user asks about entities or relationships in the platform data.
- Use action "answer_directly" only for general questions that do not require platform data.
- Use action "clarify" when the relationship meaning is ambiguous and cannot be safely represented.
- For "invested in", "has invested in", or "portfolio companies", use relationship_type "INVESTED_IN", source_role "INVESTOR", target_role "COMPANY".
- For "interested in investing" or "investment interest", use relationship_type "INVESTMENT_INTEREST".
- For mentorship questions, use relationship_type "MENTORSHIP".
- For service credits, cloud credits, perks, or in-kind benefits, use relationship_type "SERVICE_BENEFIT".
- If the user asks what companies/person X invested in, put X in source_name.
- If the user asks who invested in company X, put X in target_name.

User message: {message!r}
""".strip()


def run_agent(message: str) -> AgentResponse:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return AgentResponse(
            action="clarify",
            message="Gemini is not configured yet. Set GEMINI_API_KEY on the backend to enable the AI chatbot.",
        )

    import google.generativeai as genai

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(
        _model_name(),
        generation_config={
            "temperature": 0.1,
            "response_mime_type": "application/json",
        },
    )
    raw = model.generate_content(_build_prompt(message)).text or ""

    try:
        plan = LlmPlan.model_validate(_extract_json(raw))
    except (ValueError, json.JSONDecodeError, ValidationError):
        return AgentResponse(
            action="clarify",
            message="I could not safely translate that into a platform query. Can you rephrase the relationship you want to search?",
        )

    if plan.action == "search_redirect":
        if not plan.filters:
            return AgentResponse(
                action="clarify",
                message="Which entity or relationship should I search for?",
            )
        query = urlencode(plan.filters)
        return AgentResponse(
            action="search_redirect",
            message=plan.message
            or "I found this as a relationship search. Opening the filtered results.",
            redirect_url=f"/search?{query}",
            filters=plan.filters,
        )

    return AgentResponse(
        action=plan.action,
        message=plan.message or "Can you clarify what you want to find?",
        filters=plan.filters,
    )
