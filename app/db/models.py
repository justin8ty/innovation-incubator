from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.database import Base


class Entity(Base):
    __tablename__ = "entities"

    id = Column(Integer, primary_key=True, index=True)
    role = Column(String, nullable=False)
    industry = Column(String)
    stage = Column(String)
    timezone = Column(String)

    expertise = relationship("EntityExpertise", back_populates="entity")


class ExpertiseTag(Base):
    __tablename__ = "expertise_tags"

    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True)


class EntityExpertise(Base):
    __tablename__ = "entity_expertise"

    entity_id = Column(Integer, ForeignKey("entities.id"), primary_key=True)
    tag_id = Column(Integer, ForeignKey("expertise_tags.id"), primary_key=True)

    entity = relationship("Entity", back_populates="expertise")


class Relationship(Base):
    __tablename__ = "relationships"

    id = Column(Integer, primary_key=True)
    mentor_id = Column(Integer, ForeignKey("entities.id"))
    company_id = Column(Integer, ForeignKey("entities.id"))

    status = Column(String, default="PENDING")
    past_success_score = Column(Float, default=0.0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True)

    relationship_id = Column(Integer, ForeignKey("relationships.id"))

    rating = Column(Float, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
