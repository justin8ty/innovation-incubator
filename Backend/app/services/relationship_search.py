from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import or_
from sqlalchemy.orm import Session, aliased

from app.db.models import Entity, ExpertiseTag, Relationship, RelationshipType


@dataclass
class RelationshipSearchPlan:
    source_name: str | None = None
    target_name: str | None = None
    source_role: str | None = None
    target_role: str | None = None
    relationship_type: str | None = None
    expertise: str | None = None
    count_only: bool = False


def _contains(column, value: str | None):
    if not value:
        return None
    return column.ilike(f"%{value.strip()}%")


def serialize_sql_relationship(row: tuple[Relationship, Entity, Entity, RelationshipType | None]) -> dict:
    relationship, source, target, rel_type = row
    return {
        "id": relationship.id,
        "source_entity_id": source.id,
        "source_entity_name": source.name,
        "source_role": source.role,
        "target_entity_id": target.id,
        "target_entity_name": target.name,
        "target_role": target.role,
        "relationship_type": rel_type.code if rel_type else None,
        "relationship_type_name": rel_type.name if rel_type else None,
        "status": relationship.status,
        "strength_score": relationship.strength_score,
        "ai_reasoning_summary": relationship.ai_reasoning_summary,
    }


def run_relationship_search(db: Session, plan: RelationshipSearchPlan, limit: int = 25) -> dict:
    """Execute a safe ORM relationship/expertise search from an LLM-produced plan."""
    source = aliased(Entity)
    target = aliased(Entity)

    query = (
        db.query(Relationship, source, target, RelationshipType)
        .join(source, Relationship.source_entity_id == source.id)
        .join(target, Relationship.target_entity_id == target.id)
        .outerjoin(RelationshipType, Relationship.relationship_type_id == RelationshipType.id)
    )

    filters = []
    for condition in [
        _contains(source.name, plan.source_name),
        _contains(target.name, plan.target_name),
        source.role == plan.source_role.upper() if plan.source_role else None,
        target.role == plan.target_role.upper() if plan.target_role else None,
        RelationshipType.code == plan.relationship_type.upper() if plan.relationship_type else None,
    ]:
        if condition is not None:
            filters.append(condition)

    if filters:
        query = query.filter(*filters)

    rows = query.order_by(Relationship.strength_score.desc(), Relationship.id.desc()).limit(limit).all()

    expertise_matches = []
    if plan.expertise and (plan.source_name or plan.target_name or plan.source_role or plan.target_role):
        entity_query = db.query(Entity).join(Entity.expertise).join(ExpertiseTag)
        entity_filters = [_contains(ExpertiseTag.name, plan.expertise)]
        if plan.source_name or plan.target_name:
            name_filters = [condition for condition in [_contains(Entity.name, plan.source_name), _contains(Entity.name, plan.target_name)] if condition is not None]
            if name_filters:
                entity_filters.append(or_(*name_filters))
        if plan.source_role or plan.target_role:
            roles = [role.upper() for role in [plan.source_role, plan.target_role] if role]
            entity_filters.append(Entity.role.in_(roles))
        expertise_matches = [
            {
                "id": entity.id,
                "name": entity.name,
                "role": entity.role,
                "industry": entity.industry,
                "description": entity.description,
                "expertise": [link.tag.name for link in entity.expertise if link.tag],
            }
            for entity in entity_query.filter(*entity_filters).limit(limit).all()
        ]

    return {
        "query_plan": plan.__dict__,
        "count": len(rows),
        "count_only": plan.count_only,
        "relationships": [serialize_sql_relationship(row) for row in rows],
        "expertise_matches": expertise_matches,
    }
