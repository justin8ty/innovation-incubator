from app.db.database import SessionLocal
from app.db.models import Entity, Relationship, RelationshipType, Protocol, ProtocolRule, ExpertiseTag

def simulate_trl_milestone(startup_name: str, new_trl_level: str):
    db = SessionLocal()
    
    print(f"🚀 [EVENT] Startup '{startup_name}' reached {new_trl_level}")
    startup = db.query(Entity).filter(Entity.name == startup_name).first()
    
    # 1. Fetch active protocol rules that match this trigger
    # (Assuming startup is enrolled in Cradle Pre-Seed Protocol)
    triggered_rules = db.query(ProtocolRule).filter(
        ProtocolRule.trigger_type == "MILESTONE_REACHED",
        ProtocolRule.trigger_value == new_trl_level
    ).all()
    
    for rule in triggered_rules:
        print(f"⚙️ [RULE MATCHED] Looking for a {rule.target_role} specializing in '{rule.target_tag}'...")
        
        # 2. Find exact match provider
        provider = db.query(Entity).join(Entity.expertise).join(ExpertiseTag).filter(
            Entity.role == rule.target_role,
            ExpertiseTag.name == rule.target_tag
        ).first()
        
        if provider:
            rel_type = db.query(RelationshipType).filter(RelationshipType.code == "SERVICE_BENEFIT").first()
            
            # 3. Create PROPOSED Linkage
            new_linkage = Relationship(
                source_entity_id=provider.id,
                target_entity_id=startup.id,
                relationship_type_id=rel_type.id,
                status="PROPOSED",
                ai_reasoning_summary=f"Automated linkage via Protocol: Reached {new_trl_level}"
            )
            db.add(new_linkage)
            db.commit()
            print(f"✅ [SUCCESS] Proposed linkage created: {provider.name} -> {startup.name}")
            print(f"📊 Refresh http://localhost:8000/static/graph.html to visualize!")

    db.close()

if __name__ == "__main__":
    simulate_trl_milestone("MediLedger AI", "TRL 4")