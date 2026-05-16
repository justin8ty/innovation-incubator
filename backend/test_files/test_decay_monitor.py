import os
import requests
from datetime import datetime, timezone, timedelta
from app.db.database import SessionLocal
from app.db.models import Relationship

# You can get these via BotFather on Telegram
TELEGRAM_BOT_TOKEN = "8850504953:AAGj5U4FQFgBR_9E7sZZkCdSWSeMcpxgMyg"
TELEGRAM_CHAT_ID = "1809622937"


def send_telegram_alert(message: str):
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {"chat_id": TELEGRAM_CHAT_ID, "text": message}
    requests.post(url, json=payload)
    print(f"📲 Telegram alert sent: {message}")

def check_linkage_decay():
    db = SessionLocal()
    now = datetime.now(timezone.utc)
    
    # Get all active linkages
    active_linkages = db.query(Relationship).filter(Relationship.status == "ACTIVE").all()
    
    decayed_count = 0
    for linkage in active_linkages:
        # Calculate days since last interaction
        interaction_time = linkage.last_interaction_at.replace(tzinfo=timezone.utc) if linkage.last_interaction_at.tzinfo is None else linkage.last_interaction_at
        days_idle = (now - interaction_time).days
        
        # Artificial decay formula: lose 2.5 points per day idle
        new_health = max(0.0, 100.0 - (days_idle * 2.5))
        linkage.health_score = new_health
        
        if days_idle >= 45 and linkage.status != "DECAYING":
            linkage.status = "DECAYING"
            decayed_count += 1
            
            # Send Telegram Alert
            alert_msg = (
                f"⚠️ *Ecosystem Warning*\n\n"
                f"Linkage ID: {linkage.id}\n"
                f"Source: {linkage.source_entity.name}\n"
                f"Target: {linkage.target_entity.name}\n\n"
                f"Status changed to DECAYING. Zero interactions in {days_idle} days."
            )
            send_telegram_alert(alert_msg)
            
    db.commit()
    db.close()
    
    if decayed_count > 0:
        print(f"Processed {decayed_count} decaying linkages.")

if __name__ == "__main__":
    check_linkage_decay()