from datetime import datetime, timezone

from fastapi import Depends, FastAPI, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.db.models import Entity, Feedback, Milestone, Relationship, RelationshipType
from app.services.scoring import score_relationship

app = FastAPI(title="Innovation Incubator Relationship Graph")


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
