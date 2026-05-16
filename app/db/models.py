from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship as orm_relationship
from sqlalchemy.sql import func

from app.db.database import Base


class Entity(Base):
    __tablename__ = "entities"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=True)
    role = Column(String, nullable=False)
    industry = Column(String)
    stage = Column(String)
    timezone = Column(String)
    country = Column(String)
    description = Column(Text)
    verified_status = Column(String, default="UNVERIFIED")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    expertise = orm_relationship("EntityExpertise", back_populates="entity", cascade="all, delete-orphan")
    outgoing_relationships = orm_relationship(
        "Relationship",
        foreign_keys="Relationship.source_entity_id",
        back_populates="source_entity",
    )
    incoming_relationships = orm_relationship(
        "Relationship",
        foreign_keys="Relationship.target_entity_id",
        back_populates="target_entity",
    )
    feedback_given = orm_relationship("Feedback", back_populates="from_entity")


class ExpertiseTag(Base):
    __tablename__ = "expertise_tags"

    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False)

    entities = orm_relationship("EntityExpertise", back_populates="tag", cascade="all, delete-orphan")


class EntityExpertise(Base):
    __tablename__ = "entity_expertise"

    entity_id = Column(Integer, ForeignKey("entities.id"), primary_key=True)
    tag_id = Column(Integer, ForeignKey("expertise_tags.id"), primary_key=True)
    weight = Column(Float, default=1.0)

    entity = orm_relationship("Entity", back_populates="expertise")
    tag = orm_relationship("ExpertiseTag", back_populates="entities")


class RelationshipType(Base):
    __tablename__ = "relationship_types"

    id = Column(Integer, primary_key=True)
    code = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    relationships = orm_relationship("Relationship", back_populates="relationship_type")


class Relationship(Base):
    __tablename__ = "relationships"

    id = Column(Integer, primary_key=True)
    source_entity_id = Column(Integer, ForeignKey("entities.id"), nullable=False)
    target_entity_id = Column(Integer, ForeignKey("entities.id"), nullable=False)
    relationship_type_id = Column(Integer, ForeignKey("relationship_types.id"), nullable=True)

    status = Column(String, default="PROPOSED")
    strength_score = Column(Float, default=0.0)
    industry_similarity = Column(Float, default=0.0)
    expertise_alignment = Column(Float, default=0.0)
    stage_match = Column(Float, default=0.0)
    geo_match = Column(Float, default=0.0)
    past_success_score = Column(Float, default=0.0)
    mentor_success_score = Column(Float, default=0.0)
    ai_reasoning_summary = Column(Text)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    activated_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))

    source_entity = orm_relationship(
        "Entity",
        foreign_keys=[source_entity_id],
        back_populates="outgoing_relationships",
    )
    target_entity = orm_relationship(
        "Entity",
        foreign_keys=[target_entity_id],
        back_populates="incoming_relationships",
    )
    relationship_type = orm_relationship("RelationshipType", back_populates="relationships")
    milestones = orm_relationship("Milestone", back_populates="relationship", cascade="all, delete-orphan")
    feedback = orm_relationship("Feedback", back_populates="relationship", cascade="all, delete-orphan")


class Milestone(Base):
    __tablename__ = "milestones"

    id = Column(Integer, primary_key=True)
    relationship_id = Column(Integer, ForeignKey("relationships.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text)
    status = Column(String, default="TODO")
    completed_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    relationship = orm_relationship("Relationship", back_populates="milestones")


class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True)
    relationship_id = Column(Integer, ForeignKey("relationships.id"), nullable=False)
    from_entity_id = Column(Integer, ForeignKey("entities.id"), nullable=True)
    rating = Column(Float, nullable=False)
    text_feedback = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    relationship = orm_relationship("Relationship", back_populates="feedback")
    from_entity = orm_relationship("Entity", back_populates="feedback_given")
