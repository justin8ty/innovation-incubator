from datetime import datetime, timezone

import os

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sqlalchemy import or_
from sqlalchemy.orm import Session, aliased

from app.db.database import SessionLocal
from app.db.models import Entity, Feedback, Milestone, Need, Relationship, RelationshipType
from app.services.agent import AgentRequest, AgentResponse, run_agent
from app.services.scoring import score_relationship

app = FastAPI(title="Innovation Incubator Relationship Graph")

allowed_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="app/static"), name="static")


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


@app.get("/debug/routes")
def debug_routes():
    return {
        "app_title": app.title,
        "gemini_configured": os.getenv("GEMINI_API_KEY") is not None,
        "routes": sorted(
            {
                f"{','.join(sorted(route.methods or []))} {route.path}"
                for route in app.routes
                if hasattr(route, "methods")
            }
        ),
    }


@app.post("/agent/chat", response_model=AgentResponse)
def agent_chat(payload: AgentRequest):
    return run_agent(payload.message)


def role_filter_values(role: str) -> list[str]:
    normalized = role.strip().upper()
    if normalized == "COMPANY":
        return ["COMPANY", "STARTUP"]
    return [normalized]


@app.get("/search/relationships")
def search_relationships(
    source_name: str | None = Query(default=None),
    source_role: str | None = Query(default=None),
    target_name: str | None = Query(default=None),
    target_role: str | None = Query(default=None),
    relationship_type: str | None = Query(default=None),
    status: str | None = Query(default=None),
    industry: str | None = Query(default=None),
    stage: str | None = Query(default=None),
    country: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    SourceEntity = aliased(Entity)
    TargetEntity = aliased(Entity)

    query = (
        db.query(Relationship)
        .join(SourceEntity, Relationship.source_entity_id == SourceEntity.id)
        .join(TargetEntity, Relationship.target_entity_id == TargetEntity.id)
        .outerjoin(RelationshipType, Relationship.relationship_type_id == RelationshipType.id)
    )

    if source_name:
        query = query.filter(SourceEntity.name.ilike(f"%{source_name.strip()}%"))
    if target_name:
        query = query.filter(TargetEntity.name.ilike(f"%{target_name.strip()}%"))
    if source_role:
        query = query.filter(SourceEntity.role.in_(role_filter_values(source_role)))
    if target_role:
        query = query.filter(TargetEntity.role.in_(role_filter_values(target_role)))
    if relationship_type:
        query = query.filter(RelationshipType.code == relationship_type.strip().upper())
    if status:
        query = query.filter(Relationship.status == status.strip().upper())
    if industry:
        value = f"%{industry.strip()}%"
        query = query.filter(or_(SourceEntity.industry.ilike(value), TargetEntity.industry.ilike(value)))
    if stage:
        value = f"%{stage.strip()}%"
        query = query.filter(or_(SourceEntity.stage.ilike(value), TargetEntity.stage.ilike(value)))
    if country:
        value = f"%{country.strip()}%"
        query = query.filter(or_(SourceEntity.country.ilike(value), TargetEntity.country.ilike(value)))

    relationships = query.order_by(Relationship.strength_score.desc(), Relationship.id.desc()).limit(50).all()
    return {
        "filters": {
            "source_name": source_name,
            "source_role": source_role,
            "target_name": target_name,
            "target_role": target_role,
            "relationship_type": relationship_type,
            "status": status,
            "industry": industry,
            "stage": stage,
            "country": country,
        },
        "results": [serialize_relationship(relationship) for relationship in relationships],
    }


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
