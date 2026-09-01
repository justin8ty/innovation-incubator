from datetime import datetime, timezone
import json
import os

import docx
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import fitz  # PyMuPDF
import google.generativeai as genai
from pydantic import BaseModel
from sqlalchemy.orm import Session

load_dotenv()

from app.db.database import SessionLocal
from app.db.models import Entity, Feedback, Milestone, Need, Relationship, RelationshipType
from app.services.agent import search_response
from app.services.relationship_search import RelationshipSearchPlan, run_relationship_search
from app.services.scoring import score_relationship

try:
    from vector.db import get_db_conn, init_vec_table
    from vector.vector_store import (
        embed_all_campaigns,
        embed_all_entities,
        embed_campaign,
        embed_entity,
        match_for_entity,
        search as vector_search,
    )
    VECTOR_AVAILABLE = True
except Exception as exc:
    print(f"DEBUG: Vector modules import warning: {exc}")
    VECTOR_AVAILABLE = False

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)

print(
    "DEBUG app.main config:",
    {
        "google_api_key_configured": bool(GOOGLE_API_KEY),
        "agent_model": os.getenv("AGENT_MODEL", os.getenv("RANK_MODEL", "gemini-2.5-flash-lite")),
        "vector_available": VECTOR_AVAILABLE,
    },
)

app = FastAPI(title="Innovation Incubator API")

cors_origins_raw = os.getenv("CORS_ORIGINS", "*")
cors_origins = ["*"] if cors_origins_raw == "*" else [o.strip() for o in cors_origins_raw.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

static_dir = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(static_dir, exist_ok=True)
uploads_dir = os.path.join(static_dir, "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")


@app.on_event("startup")
def on_startup():
    routes = sorted(
        f"{','.join(sorted(getattr(route, 'methods', []) or []))} {getattr(route, 'path', '')}"
        for route in app.routes
    )
    print("DEBUG app.main startup: registered routes:", routes, flush=True)

    if VECTOR_AVAILABLE:
        try:
            from vector.config import DB_PATH
            db_target = DB_PATH if os.path.exists(DB_PATH) else "./rels.db"
            if os.path.exists(db_target):
                print("DEBUG vector startup: initializing vec table", flush=True)
                init_vec_table()
                conn = get_db_conn()
                count = conn.execute("SELECT COUNT(*) FROM vec_entities").fetchone()[0]
                conn.close()
                if count == 0:
                    print("DEBUG vector startup: populating embeddings", flush=True)
                    embed_all_entities()
                    embed_all_campaigns()
        except Exception as err:
            print(f"DEBUG vector startup: vector initialization notice: {err}", flush=True)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class EntityCreate(BaseModel):
    name: str | None = None
    role: str
    industry: str | None = None
    stage: str | None = None
    timezone: str | None = None
    country: str | None = None
    description: str | None = None
    verified_status: str = "UNVERIFIED"


class RelationshipPropose(BaseModel):
    source_entity_id: int
    target_entity_id: int
    relationship_type_code: str
    past_success_score: float = 0.0
    mentor_success_score: float = 0.0
    ai_reasoning_summary: str | None = None


class FeedbackCreate(BaseModel):
    from_entity_id: int | None = None
    rating: float
    text_feedback: str | None = None


class MilestoneCreate(BaseModel):
    name: str
    description: str | None = None
    status: str = "TODO"


class NeedCreate(BaseModel):
    title: str
    description: str | None = None
    requested_tags: list[str] = []


class ChatRequest(BaseModel):
    message: str
    entity_id: int | None = None


class RelationshipSearchRequest(BaseModel):
    source_name: str | None = None
    target_name: str | None = None
    source_role: str | None = None
    target_role: str | None = None
    relationship_type: str | None = None
    expertise: str | None = None
    count_only: bool = False


def parse_tags(raw_tags: str | None) -> list[str]:
    if not raw_tags:
        return []
    return [tag.strip() for tag in raw_tags.split(",") if tag.strip()]


def dump_tags(tags: list[str]) -> str:
    return ",".join(tag.strip().lower() for tag in tags if tag.strip())


def serialize_need(need: Need) -> dict:
    return {
        "id": need.id,
        "entity_id": need.entity_id,
        "entity_name": need.entity.name if need.entity else None,
        "title": need.title,
        "description": need.description,
        "requested_tags": parse_tags(need.requested_tags),
        "status": need.status,
    }


def serialize_entity(entity: Entity) -> dict:
    return {
        "id": entity.id,
        "name": entity.name,
        "role": entity.role,
        "industry": entity.industry,
        "stage": entity.stage,
        "timezone": entity.timezone,
        "country": entity.country,
        "description": entity.description,
        "verified_status": entity.verified_status,
        "expertise": [link.tag.name for link in entity.expertise if link.tag],
    }


def serialize_relationship_type(rel_type: RelationshipType) -> dict:
    return {
        "id": rel_type.id,
        "code": rel_type.code,
        "name": rel_type.name,
        "description": rel_type.description,
    }


def serialize_relationship(relationship: Relationship) -> dict:
    return {
        "id": relationship.id,
        "source_entity_id": relationship.source_entity_id,
        "source_entity_name": relationship.source_entity.name if relationship.source_entity else None,
        "target_entity_id": relationship.target_entity_id,
        "target_entity_name": relationship.target_entity.name if relationship.target_entity else None,
        "relationship_type": relationship.relationship_type.code if relationship.relationship_type else None,
        "status": relationship.status,
        "strength_score": relationship.strength_score,
        "score_components": {
            "industry_similarity": relationship.industry_similarity,
            "expertise_alignment": relationship.expertise_alignment,
            "stage_match": relationship.stage_match,
            "geo_match": relationship.geo_match,
            "past_success_score": relationship.past_success_score,
            "mentor_success_score": relationship.mentor_success_score,
        },
        "ai_reasoning_summary": relationship.ai_reasoning_summary,
        "milestones": [
            {
                "id": milestone.id,
                "name": milestone.name,
                "description": milestone.description,
                "status": milestone.status,
                "completed_at": milestone.completed_at,
            }
            for milestone in relationship.milestones
        ],
        "feedback": [
            {
                "id": feedback.id,
                "from_entity_id": feedback.from_entity_id,
                "rating": feedback.rating,
                "text_feedback": feedback.text_feedback,
            }
            for feedback in relationship.feedback
        ],
    }


@app.get("/")
def root():
    return {"status": "ok", "service": "relationship-graph"}


@app.get("/entities")
def list_entities(db: Session = Depends(get_db)):
    return [serialize_entity(entity) for entity in db.query(Entity).order_by(Entity.id).all()]


@app.post("/entities")
def create_entity(payload: EntityCreate, db: Session = Depends(get_db)):
    entity = Entity(**payload.model_dump())
    db.add(entity)
    db.commit()
    db.refresh(entity)
    return serialize_entity(entity)


@app.get("/needs")
def list_needs(db: Session = Depends(get_db)):
    return [serialize_need(need) for need in db.query(Need).order_by(Need.id).all()]


@app.post("/entities/{entity_id}/needs")
def create_need(entity_id: int, payload: NeedCreate, db: Session = Depends(get_db)):
    entity = db.get(Entity, entity_id)
    if entity is None:
        raise HTTPException(status_code=404, detail="entity not found")

    need = Need(
        entity=entity,
        title=payload.title,
        description=payload.description,
        requested_tags=dump_tags(payload.requested_tags),
        status="OPEN",
    )
    db.add(need)
    db.commit()
    db.refresh(need)
    return serialize_need(need)


@app.get("/relationship-types")
def list_relationship_types(db: Session = Depends(get_db)):
    return [
        serialize_relationship_type(rel_type)
        for rel_type in db.query(RelationshipType).order_by(RelationshipType.code).all()
    ]


@app.get("/relationships")
def list_relationships(db: Session = Depends(get_db)):
    return [
        serialize_relationship(relationship)
        for relationship in db.query(Relationship).order_by(Relationship.id).all()
    ]


@app.get("/search")
def ecosystem_search(q: str = Query(..., min_length=1), entity_id: int | None = None, db: Session = Depends(get_db)):
    vector_payload = {"ai_suggested": [], "results": [], "error": None}
    try:
        from vector.vector_store import search as vector_search

        vector_payload = vector_search(q, entity_id=entity_id, top_k=5)
        vector_payload.setdefault("error", None)
    except Exception as exc:
        vector_payload = {"ai_suggested": [], "results": [], "error": str(exc)}

    sql_payload = {"query_plan": {}, "count": 0, "relationships": [], "expertise_matches": [], "error": None}
    try:
        agent_payload = search_response(db, q, entity_id=entity_id)
        sql_payload = agent_payload.get("sql_results", sql_payload)
        sql_payload["error"] = None
    except Exception as exc:
        sql_payload["error"] = str(exc)

    return {
        "query": q,
        "vector_results": vector_payload.get("results", []),
        "reranked_results": vector_payload.get("ai_suggested", []),
        "sql_results": sql_payload,
        "errors": {
            "vector": vector_payload.get("error"),
            "sql": sql_payload.get("error"),
        },
    }


@app.post("/agent/chat")
def agent_chat(payload: ChatRequest, db: Session = Depends(get_db)):
    print(
        "DEBUG agent_chat: received request",
        {"message_len": len(payload.message), "entity_id": payload.entity_id},
    )
    try:
        response = search_response(db, payload.message, entity_id=payload.entity_id)
        print(
            "DEBUG agent_chat: sending response",
            {"action": response.get("action"), "redirect_url": response.get("redirect_url")},
        )
        return response
    except Exception as exc:
        print("DEBUG agent_chat: error", repr(exc))
        raise HTTPException(status_code=503, detail=f"agent unavailable: {exc}") from exc


@app.post("/relationships/search")
def relationship_search(payload: RelationshipSearchRequest, db: Session = Depends(get_db)):
    return run_relationship_search(db, RelationshipSearchPlan(**payload.model_dump()))


@app.get("/graph")
def relationship_graph(db: Session = Depends(get_db)):
    entities = db.query(Entity).order_by(Entity.id).all()
    relationships = db.query(Relationship).order_by(Relationship.id).all()

    return {
        "nodes": [
            {
                # ADD PREFIX 'node-'
                "id": f"node-{entity.id}", 
                "label": entity.name or f"{entity.role} #{entity.id}",
                "role": entity.role,
                "industry": entity.industry,
                "stage": entity.stage,
                "verified_status": entity.verified_status,
            }
            for entity in entities
        ],
        "edges": [
            {
                # ADD PREFIX 'edge-'
                "id": f"edge-{relationship.id}", 
                # SOURCE AND TARGET MUST MATCH THE NEW NODE IDs
                "source": f"node-{relationship.source_entity_id}", 
                "target": f"node-{relationship.target_entity_id}",
                "label": relationship.relationship_type.code if relationship.relationship_type else "RELATIONSHIP",
                "status": relationship.status,
                "strength_score": relationship.strength_score or 0.0,
                "reasoning": relationship.ai_reasoning_summary,
            }
            for relationship in relationships
        ],
    }
    

@app.post("/needs/{need_id}/match")
def match_need(need_id: int, db: Session = Depends(get_db)):
    need = db.get(Need, need_id)
    if need is None:
        raise HTTPException(status_code=404, detail="need not found")

    requester = need.entity
    requested_tags = set(parse_tags(need.requested_tags))
    candidates = (
        db.query(Entity)
        .filter(Entity.id != requester.id, Entity.role.in_(["MENTOR", "SERVICE_PROVIDER", "PROGRAMME", "PARTNER", "INVESTOR"]))
        .all()
    )

    proposals = []
    for candidate in candidates:
        candidate_tags = {link.tag.name.lower() for link in candidate.expertise if link.tag and link.tag.name}
        tag_overlap = len(requested_tags & candidate_tags)
        if requested_tags and tag_overlap == 0:
            continue

        if candidate.role == "MENTOR":
            relationship_type_code = "MENTORSHIP"
            source, target = candidate, requester
        elif candidate.role == "SERVICE_PROVIDER":
            relationship_type_code = "SERVICE_BENEFIT"
            source, target = candidate, requester
        elif candidate.role == "PROGRAMME":
            relationship_type_code = "PROGRAMME_ASSIGNMENT"
            source, target = requester, candidate
        elif candidate.role == "INVESTOR":
            relationship_type_code = "INVESTMENT_INTEREST"
            source, target = candidate, requester
        else:
            relationship_type_code = "PARTNER_INITIATIVE"
            source, target = candidate, requester

        rel_type = db.query(RelationshipType).filter(RelationshipType.code == relationship_type_code).one_or_none()
        if rel_type is None:
            continue

        existing = (
            db.query(Relationship)
            .filter(
                Relationship.source_entity_id == source.id,
                Relationship.target_entity_id == target.id,
                Relationship.relationship_type_id == rel_type.id,
                Relationship.status.in_(["PROPOSED", "PENDING", "ACTIVE"]),
            )
            .one_or_none()
        )
        if existing:
            proposals.append(existing)
            continue

        score = score_relationship(source, target, past_success_score=0.0, mentor_success_score=0.0)
        tag_boost = min(0.2, tag_overlap * 0.05)
        strength_score = min(1.0, score.strength_score + tag_boost)
        relationship = Relationship(
            source_entity=source,
            target_entity=target,
            relationship_type=rel_type,
            status="PROPOSED",
            strength_score=round(strength_score, 4),
            industry_similarity=score.industry_similarity,
            expertise_alignment=max(score.expertise_alignment, tag_overlap / max(1, len(requested_tags)) if requested_tags else 0.0),
            stage_match=score.stage_match,
            geo_match=score.geo_match,
            past_success_score=score.past_success_score,
            mentor_success_score=score.mentor_success_score,
            ai_reasoning_summary=(
                f"Matched need '{need.title}' with {candidate.name or candidate.role} "
                f"using overlapping tags: {', '.join(sorted(requested_tags & candidate_tags)) or 'profile context'}."
            ),
        )
        db.add(relationship)
        proposals.append(relationship)

    need.status = "MATCHED" if proposals else "OPEN"
    db.commit()
    for proposal in proposals:
        db.refresh(proposal)

    proposals.sort(key=lambda relationship: relationship.strength_score or 0.0, reverse=True)
    return {
        "need": serialize_need(need),
        "matches": [serialize_relationship(relationship) for relationship in proposals[:5]],
    }


@app.post("/relationships/propose")
def propose_relationship(payload: RelationshipPropose, db: Session = Depends(get_db)):
    source = db.get(Entity, payload.source_entity_id)
    target = db.get(Entity, payload.target_entity_id)
    rel_type = (
        db.query(RelationshipType)
        .filter(RelationshipType.code == payload.relationship_type_code)
        .one_or_none()
    )

    if source is None:
        raise HTTPException(status_code=404, detail="source_entity_id not found")
    if target is None:
        raise HTTPException(status_code=404, detail="target_entity_id not found")
    if rel_type is None:
        raise HTTPException(status_code=404, detail="relationship_type_code not found")

    existing = db.query(Relationship).filter(
        Relationship.source_entity_id == payload.source_entity_id,
        Relationship.target_entity_id == payload.target_entity_id,
        Relationship.status.in_(["PROPOSED", "ACTIVE", "PENDING"])
    ).first()
    
    if existing:
        return serialize_relationship(existing) # Return existing instead of creating junk
    
    score = score_relationship(
        source,
        target,
        past_success_score=payload.past_success_score,
        mentor_success_score=payload.mentor_success_score,
    )
    relationship = Relationship(
        source_entity=source,
        target_entity=target,
        relationship_type=rel_type,
        status="PROPOSED",
        strength_score=score.strength_score,
        industry_similarity=score.industry_similarity,
        expertise_alignment=score.expertise_alignment,
        stage_match=score.stage_match,
        geo_match=score.geo_match,
        past_success_score=score.past_success_score,
        mentor_success_score=score.mentor_success_score,
        ai_reasoning_summary=payload.ai_reasoning_summary,
    )
    db.add(relationship)
    db.commit()
    db.refresh(relationship)
    return serialize_relationship(relationship)


@app.post("/relationships/{relationship_id}/activate")
def activate_relationship(relationship_id: int, db: Session = Depends(get_db)):
    relationship = db.get(Relationship, relationship_id)
    if relationship is None:
        raise HTTPException(status_code=404, detail="relationship not found")
    relationship.status = "ACTIVE"
    relationship.activated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(relationship)
    return serialize_relationship(relationship)


@app.post("/relationships/{relationship_id}/reject")
def reject_relationship(relationship_id: int, db: Session = Depends(get_db)):
    relationship = db.get(Relationship, relationship_id)
    if relationship is None:
        raise HTTPException(status_code=404, detail="relationship not found")
    relationship.status = "REJECTED"
    db.commit()
    db.refresh(relationship)
    return serialize_relationship(relationship)


@app.post("/relationships/{relationship_id}/complete")
def complete_relationship(relationship_id: int, db: Session = Depends(get_db)):
    relationship = db.get(Relationship, relationship_id)
    if relationship is None:
        raise HTTPException(status_code=404, detail="relationship not found")
    relationship.status = "COMPLETED"
    relationship.completed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(relationship)
    return serialize_relationship(relationship)


@app.post("/relationships/{relationship_id}/feedback")
def add_feedback(relationship_id: int, payload: FeedbackCreate, db: Session = Depends(get_db)):
    relationship = db.get(Relationship, relationship_id)
    if relationship is None:
        raise HTTPException(status_code=404, detail="relationship not found")
    if payload.from_entity_id is not None and db.get(Entity, payload.from_entity_id) is None:
        raise HTTPException(status_code=404, detail="from_entity_id not found")

    feedback = Feedback(relationship=relationship, **payload.model_dump())
    db.add(feedback)
    
    db.commit()
    db.refresh(relationship)
    return serialize_relationship(relationship)


@app.post("/milestones/{milestone_id}/complete")
def complete_milestone(relationship_id: int, milestone_id: int, db: Session = Depends(get_db)):
    milestone = db.get(Milestone, milestone_id)
    relationship = db.get(Relationship, relationship_id)
    
    if milestone is None or relationship is None:
        raise HTTPException(status_code=404, detail="Resource not found")
        
    milestone.status = "DONE"
    milestone.completed_at = datetime.now(timezone.utc)
    
    # --- CONCEPT 3: THE PULSE ---
    relationship.status = "ACTIVE" # Reset from DECAYING
    relationship.strength_score = 1.0 # Reset Health to 100%
    # If your model has it: relationship.last_interaction_at = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(relationship)
    return serialize_relationship(relationship)


@app.post("/relationships/{relationship_id}/milestones")
def add_milestone(relationship_id: int, payload: MilestoneCreate, db: Session = Depends(get_db)):
    relationship = db.get(Relationship, relationship_id)
    if relationship is None:
        raise HTTPException(status_code=404, detail="relationship not found")

    milestone = Milestone(relationship=relationship, **payload.model_dump())
    db.add(milestone)
    db.commit()
    db.refresh(relationship)
    return serialize_relationship(relationship)

# -- Health Check --
@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "innovation-incubator-api",
        "api_key_configured": bool(GOOGLE_API_KEY),
        "vector_available": VECTOR_AVAILABLE,
    }


# -- Document Ingestion & AI Parsing --
ROLE_QUESTIONS = {
    "innovator": {
        "name": "What is your full name?",
        "contact_email": "What is your preferred contact email address?",
        "skills": "What are your top 3 strongest technical or business skills? (Return as an array of strings)",
        "experience_level": "What is your current professional experience level (e.g., Student, Junior, Senior)?",
        "core_projects": "Could you briefly list or describe one or two past projects you have worked on? (Return as an array of strings)",
        "aspirations": "What are you looking to achieve from this ecosystem (e.g., find a co-founder, join a startup)?",
    },
    "startup": {
        "startup_name": "What is the name of your startup?",
        "industry": "What industry or market vertical does your startup operate in?",
        "funding_stage": "What is your current development or funding stage (e.g., MVP, Pre-Seed, Seed)?",
        "problem_statement": "In one or two sentences, what specific problem does your product solve?",
        "current_ask": "What is your biggest immediate need right now from the ecosystem (e.g., cloud credits, mentorship, funding)? (Return as an array of strings)",
    },
    "company": {
        "company_name": "What is your organization's name?",
        "campaign_name": "What is the official title of the campaign or initiative you are running?",
        "target_audience": "What type of startup or innovator is your ideal participant for this initiative?",
        "resources_provided": "What specific perks, resources, or API access are you offering to the participants? (Return as an array of strings)",
        "constraints": "What are the eligibility constraints or limitations for this program (e.g., location, stage)?",
    },
    "investor": {
        "firm_name": "What is the name of your investment firm or fund?",
        "investment_stage": "Which specific funding stages do you primarily target (e.g., Seed, Series A)? (Return as an array of strings)",
        "ticket_size": "What is your typical investment ticket size (minimum and maximum capital deployed)?",
        "focus_areas": "What are your primary industry or technology focus areas (e.g., Fintech, AI, HealthTech)? (Return as an array of strings)",
        "value_add": "What non-financial benefits or strategic value do you provide to your portfolio companies? (Return as an array of strings)",
    },
    "mentor": {
        "name": "What is your full name?",
        "expertise_areas": "What are your primary areas of industry or technical expertise? (Return as an array of strings)",
        "engagement_preference": "Do you prefer to mentor startups 1-on-1 directly ('startup'), participate as an advisor/judge in broader corporate hackathons ('campaign'), or 'both'?",
    },
}


def extract_text_from_pdf(file_path: str) -> str:
    doc = fitz.open(file_path)
    text = ""
    for page in doc:
        text += page.get_text()
    return text


def extract_text_from_docx(file_path: str) -> str:
    doc = docx.Document(file_path)
    return "\n".join([para.text for para in doc.paragraphs])


@app.post("/api/v1/upload")
async def upload_document(file: UploadFile = File(...), role: str = Form(...)):
    if role not in ROLE_QUESTIONS:
        raise HTTPException(status_code=400, detail=f"Invalid role: {role}")

    if not GOOGLE_API_KEY:
        raise HTTPException(
            status_code=500, detail="Gemini API Key not configured on server."
        )

    temp_path = f"temp_{file.filename}"
    with open(temp_path, "wb") as buffer:
        buffer.write(await file.read())

    try:
        raw_text = ""
        if file.filename.lower().endswith(".pdf"):
            raw_text = extract_text_from_pdf(temp_path)
        elif file.filename.lower().endswith(".docx"):
            raw_text = extract_text_from_docx(temp_path)
        else:
            try:
                with open(temp_path, "r", encoding="utf-8", errors="ignore") as f:
                    raw_text = f.read()
            except Exception as e:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unsupported file format or read error: {e}",
                )

        if not raw_text.strip():
            raise HTTPException(
                status_code=400, detail="Could not extract text from document."
            )

        questions = ROLE_QUESTIONS[role]
        system_instruction = f"""
        You are an automated data-entry assistant for the MyHack Engine ecosystem.
        Your task is to extract information from the provided document text for the role: {role}.

        You must return a JSON object with the following keys:
        {json.dumps(list(questions.keys()))}

        For each key, follow these rules:
        1. If the information is found in the text, populate the field with the extracted data.
        2. If the field hint says "(Return as an array of strings)", provide an array. Otherwise, provide a string.
        3. If the information is NOT found or is highly ambiguous, set the field to null.

        Additionally, include a key 'follow_up_questions' which is an array of strings.
        For every field that is null, add the corresponding tracking question (WITHOUT the array hint) to this array.

        Tracking Questions for reference:
        {json.dumps(questions, indent=2)}

        Output ONLY valid JSON.
        """

        model_name = os.getenv("INGEST_MODEL", "models/gemini-2.5-flash")
        model = genai.GenerativeModel(model_name)
        response = model.generate_content(
            f"System Instruction: {system_instruction}\n\nDocument Text:\n{raw_text}"
        )

        clean_text = response.text.strip()
        if clean_text.startswith("```json"):
            clean_text = clean_text.removeprefix("```json").removesuffix("```").strip()
        elif clean_text.startswith("```"):
            clean_text = clean_text.removeprefix("```").removesuffix("```").strip()

        result = json.loads(clean_text)
        extracted_follow_ups = []
        for key, question in questions.items():
            clean_question = question.split(" (Return as")[0].strip()
            if result.get(key) is None or (
                isinstance(result.get(key), list) and len(result.get(key)) == 0
            ):
                result[key] = None
                extracted_follow_ups.append(clean_question)

        result["follow_up_questions"] = extracted_follow_ups
        return result

    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to process document: {str(e)}"
        )
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


@app.post("/api/v1/pitch-analyze")
async def pitch_analyze(file: UploadFile = File(...)):
    filename = f"pitch_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{file.filename}"
    save_path = os.path.join(uploads_dir, filename)
    with open(save_path, "wb") as buffer:
        buffer.write(await file.read())

    video_url = f"/static/uploads/{filename}"
    summary = "Solid presentation demonstrating clear problem-solution alignment, high target market relevance, and strong growth potential."
    key_strengths = ["Clear value proposition", "Scalable ecosystem model", "Defined technical roadmap"]
    ecosystem_fit = 9.2
    transcript = "Our startup automates ecosystem connections and provides verified talent and mentor matching with smart milestones."

    if GOOGLE_API_KEY:
        try:
            model_name = os.getenv("AGENT_MODEL", "models/gemini-2.5-flash")
            model = genai.GenerativeModel(model_name)
            prompt = (
                "You are an expert VC pitch analyzer. Output valid JSON only with keys: "
                "\"summary\" (string), \"key_strengths\" (list of 3 strings), \"ecosystem_fit\" (float out of 10), and \"transcript\" (string summary of pitch)."
            )
            resp = model.generate_content(prompt)
            clean = resp.text.strip()
            if clean.startswith("```json"):
                clean = clean.removeprefix("```json").removesuffix("```").strip()
            elif clean.startswith("```"):
                clean = clean.removeprefix("```").removesuffix("```").strip()
            parsed = json.loads(clean)
            summary = parsed.get("summary", summary)
            key_strengths = parsed.get("key_strengths", key_strengths)
            ecosystem_fit = parsed.get("ecosystem_fit", ecosystem_fit)
            transcript = parsed.get("transcript", transcript)
        except Exception as exc:
            print(f"DEBUG: pitch-analyze gemini note: {exc}")

    return {
        "video_url": video_url,
        "transcript": transcript,
        "analysis": {
            "summary": summary,
            "key_strengths": key_strengths,
            "ecosystem_fit": ecosystem_fit,
        },
    }


# -- Vector Search Endpoints --
@app.post("/api/v1/vector/embed/entity")
async def embed_one_entity(entity_id: int):
    if not VECTOR_AVAILABLE:
        raise HTTPException(status_code=503, detail="Vector services not available")
    embed_entity(entity_id)
    return {"status": "ok", "entity_id": entity_id}


@app.post("/api/v1/vector/embed/campaign")
async def embed_one_campaign(campaign_id: int):
    if not VECTOR_AVAILABLE:
        raise HTTPException(status_code=503, detail="Vector services not available")
    embed_campaign(campaign_id)
    return {"status": "ok", "campaign_id": campaign_id}


@app.post("/api/v1/vector/embed/all")
async def embed_all():
    if not VECTOR_AVAILABLE:
        raise HTTPException(status_code=503, detail="Vector services not available")
    embed_all_entities()
    embed_all_campaigns()
    return {"status": "ok", "message": "All entities and campaigns embedded"}


@app.post("/api/v1/vector/match")
async def match(entity_id: int, campaign_id: int = None, top_k: int = 3):
    if not VECTOR_AVAILABLE:
        raise HTTPException(status_code=503, detail="Vector services not available")
    result = match_for_entity(entity_id=entity_id, campaign_id=campaign_id, top_k=top_k)
    return result


@app.post("/api/v1/vector/search")
async def search_endpoint(query: str, entity_id: int = None, top_k: int = 1):
    if not VECTOR_AVAILABLE:
        raise HTTPException(status_code=503, detail="Vector services not available")
    result = vector_search(query=query, entity_id=entity_id, top_k=top_k)
    return result
