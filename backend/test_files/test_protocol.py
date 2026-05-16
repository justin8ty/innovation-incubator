from app.db.database import SessionLocal
from app.db.models import Entity, Relationship, RelationshipType, ProtocolRule, ExpertiseTag

def simulate_trl_milestone(startup_name: str, new_trl_level: str):
    db = SessionLocal()
    
    print(f"🚀 [EVENT] {startup_name} reached {new_trl_level}")
    startup = db.query(Entity).filter(Entity.name == startup_name).first()
    
    # 1. Fetch the rule
    rule = db.query(ProtocolRule).filter(ProtocolRule.trigger_value == new_trl_level).first()
    
    if not rule:
        print("❌ Error: No Protocol Rule found for this TRL level in DB.")
        return

    # 2. Find provider using case-insensitive tag match
    provider = db.query(Entity).join(Entity.expertise).join(ExpertiseTag).filter(
        Entity.role == rule.target_role,
        ExpertiseTag.name.ilike(rule.target_tag) # ilike handles "Legal" vs "legal"
    ).first()
    
    if not provider:
        print(f"❌ Error: No {rule.target_role} found with tag '{rule.target_tag}'")
        db.close()
        return

    # 3. Create the linkage
    rel_type = db.query(RelationshipType).filter(RelationshipType.code == "SERVICE_BENEFIT").first()
    
    new_linkage = Relationship(
        source_entity_id=provider.id,
        target_entity_id=startup.id,
        relationship_type_id=rel_type.id,
        status="PROPOSED",
        strength_score=0.85, # Set a score so it's visible
        ai_reasoning_summary=f"Automated linkage: {startup_name} reached {new_trl_level}"
    )
    db.add(new_linkage)
    db.commit()
    print(f"✅ [SUCCESS] Created linkage: {provider.name} -> {startup.name}")
    db.close()

if __name__ == "__main__":
    simulate_trl_milestone("MediLedger AI", "TRL 4")