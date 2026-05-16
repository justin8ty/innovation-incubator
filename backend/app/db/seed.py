from app.db.database import Base, SessionLocal, engine
from app.db.models import Entity, EntityExpertise, ExpertiseTag, Feedback, Milestone, Need, Relationship, RelationshipType
from app.services.scoring import score_relationship


RELATIONSHIP_TYPES = [
    ("MENTORSHIP", "Mentorship", "Expert guidance between a mentor and startup."),
    ("SERVICE_BENEFIT", "Service Benefit", "In-kind service or partner benefit offered to a startup."),
    ("PROGRAMME_ASSIGNMENT", "Programme Assignment", "Startup assigned or recommended to a programme."),
    ("PARTNER_INITIATIVE", "Partner Initiative", "Partner connected to a strategic initiative."),
    ("INVESTMENT_INTEREST", "Investment Interest", "Investor interest in a company."),
]


def get_or_create_tag(db, name: str) -> ExpertiseTag:
    tag = db.query(ExpertiseTag).filter(ExpertiseTag.name == name).one_or_none()
    if tag:
        return tag
    tag = ExpertiseTag(name=name)
    db.add(tag)
    db.flush()
    return tag


def attach_tags(db, entity: Entity, tag_names: list[str]) -> None:
    for tag_name in tag_names:
        tag = get_or_create_tag(db, tag_name)
        if not any(link.tag_id == tag.id for link in entity.expertise):
            entity.expertise.append(EntityExpertise(tag=tag, weight=1.0))


def get_or_create_entity(db, name: str, **kwargs) -> Entity:
    entity = db.query(Entity).filter(Entity.name == name).one_or_none()
    if entity:
        return entity
    entity = Entity(name=name, **kwargs)
    db.add(entity)
    db.flush()
    return entity


def get_or_create_relationship_type(db, code: str, name: str, description: str) -> RelationshipType:
    rel_type = db.query(RelationshipType).filter(RelationshipType.code == code).one_or_none()
    if rel_type:
        return rel_type
    rel_type = RelationshipType(code=code, name=name, description=description)
    db.add(rel_type)
    db.flush()
    return rel_type


def get_or_create_need(db, entity: Entity, title: str, description: str, requested_tags: list[str]) -> Need:
    need = db.query(Need).filter(Need.entity_id == entity.id, Need.title == title).one_or_none()
    if need:
        return need
    need = Need(
        entity=entity,
        title=title,
        description=description,
        requested_tags=",".join(tag.lower() for tag in requested_tags),
        status="OPEN",
    )
    db.add(need)
    db.flush()
    return need


def create_relationship(db, source: Entity, target: Entity, rel_type: RelationshipType, reason: str) -> Relationship:
    existing = (
        db.query(Relationship)
        .filter(
            Relationship.source_entity_id == source.id,
            Relationship.target_entity_id == target.id,
            Relationship.relationship_type_id == rel_type.id,
        )
        .one_or_none()
    )
    if existing:
        return existing

    score = score_relationship(source, target, past_success_score=0.7, mentor_success_score=0.8)
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
        ai_reasoning_summary=reason,
    )
    db.add(relationship)
    db.flush()
    return relationship


def seed() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        rel_types = {
            code: get_or_create_relationship_type(db, code, name, description)
            for code, name, description in RELATIONSHIP_TYPES
        }

        startup = get_or_create_entity(
            db,
            "MediLedger AI",
            role="STARTUP",
            industry="healthcare",
            stage="seed",
            timezone="UTC+8",
            country="Singapore",
            description="Healthcare compliance startup seeking fundraising and cloud credits.",
            verified_status="VERIFIED",
        )
        attach_tags(db, startup, ["healthcare", "fundraising", "cloud credits", "compliance"])

        startup_2 = get_or_create_entity(
            db,
            "FinPilot",
            role="STARTUP",
            industry="fintech",
            stage="preseed",
            timezone="UTC+8",
            country="Malaysia",
            description="Fintech startup looking for pitch support and financial modeling.",
            verified_status="VERIFIED",
        )
        attach_tags(db, startup_2, ["fintech", "pitching", "financial modeling"])

        mentor = get_or_create_entity(
            db,
            "Aisha Tan",
            role="MENTOR",
            industry="healthcare",
            stage="seed",
            timezone="UTC+8",
            country="Singapore",
            description="Operator and angel mentor with healthcare fundraising experience.",
            verified_status="VERIFIED_EXPERT",
        )
        attach_tags(db, mentor, ["healthcare", "fundraising", "pitching", "compliance"])

        mentor_2 = get_or_create_entity(
            db,
            "Daniel Wong",
            role="MENTOR",
            industry="fintech",
            stage="preseed",
            timezone="UTC+8",
            country="Malaysia",
            description="Former CFO helping founders with financial models and investor narratives.",
            verified_status="VERIFIED_EXPERT",
        )
        attach_tags(db, mentor_2, ["fintech", "financial modeling", "pitching"])

        provider = get_or_create_entity(
            db,
            "CloudLaunch Partner Credits",
            role="SERVICE_PROVIDER",
            industry="tech",
            stage="seed",
            timezone="UTC+8",
            country="Singapore",
            description="Provides cloud credits and architecture office hours for qualified startups.",
            verified_status="VERIFIED",
        )
        attach_tags(db, provider, ["cloud credits", "architecture", "infrastructure"])

        programme = get_or_create_entity(
            db,
            "SEA Health Accelerator",
            role="PROGRAMME",
            industry="healthcare",
            stage="seed",
            timezone="UTC+8",
            country="Singapore",
            description="Regional healthcare accelerator for seed-stage startups.",
            verified_status="VERIFIED",
        )
        attach_tags(db, programme, ["healthcare", "accelerator", "fundraising"])

        mentorship = create_relationship(
            db,
            mentor,
            startup,
            rel_types["MENTORSHIP"],
            "Strong healthcare fundraising fit with matching timezone and stage.",
        )
        service_benefit = create_relationship(
            db,
            provider,
            startup,
            rel_types["SERVICE_BENEFIT"],
            "Startup needs cloud credits and provider offers relevant startup infrastructure support.",
        )
        programme_assignment = create_relationship(
            db,
            startup,
            programme,
            rel_types["PROGRAMME_ASSIGNMENT"],
            "Seed-stage healthcare startup matches the accelerator thesis.",
        )
        get_or_create_need(
            db,
            startup,
            "Need fundraising help and cloud credits",
            "Looking for a healthcare fundraising mentor and infrastructure credits for pilot deployment.",
            ["fundraising", "cloud credits", "healthcare"],
        )
        get_or_create_need(
            db,
            startup_2,
            "Need financial modeling support",
            "Need help tightening our financial model before investor meetings.",
            ["financial modeling", "pitching", "fintech"],
        )
        create_relationship(
            db,
            mentor_2,
            startup_2,
            rel_types["MENTORSHIP"],
            "Fintech mentor is aligned with the startup's financial modeling and pitching needs.",
        )

        if not mentorship.milestones:
            db.add_all(
                [
                    Milestone(relationship=mentorship, name="Intro call completed", status="DONE"),
                    Milestone(relationship=mentorship, name="Pitch deck reviewed", status="TODO"),
                ]
            )
        if not service_benefit.milestones:
            db.add(Milestone(relationship=service_benefit, name="Cloud credits claimed", status="TODO"))
        if not programme_assignment.milestones:
            db.add(Milestone(relationship=programme_assignment, name="Application submitted", status="TODO"))

        if not mentorship.feedback:
            db.add(
                Feedback(
                    relationship=mentorship,
                    from_entity=startup,
                    rating=4.5,
                    text_feedback="Relevant mentor with practical fundraising advice.",
                )
            )

        db.commit()
        print("Seed data created.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
