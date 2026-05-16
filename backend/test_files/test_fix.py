# cleanup_duplicates.py
from app.db.database import SessionLocal
from app.db.models import Relationship
from sqlalchemy import func

db = SessionLocal()

# Find duplicate pairs
duplicates = db.query(
    Relationship.source_entity_id, 
    Relationship.target_entity_id, 
    func.count(Relationship.id)
).group_by(
    Relationship.source_entity_id, 
    Relationship.target_entity_id
).having(func.count(Relationship.id) > 1).all()

for src, tgt, count in duplicates:
    # Keep only the one with the highest ID (the newest one)
    all_matches = db.query(Relationship).filter_by(
        source_entity_id=src, 
        target_entity_id=tgt
    ).order_by(Relationship.id.desc()).all()
    
    for redundant in all_matches[1:]:
        db.delete(redundant)

db.commit()
db.close()
print("Duplicates purged.")