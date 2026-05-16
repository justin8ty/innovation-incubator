import requests
from datetime import datetime, timedelta, timezone
from app.db.database import SessionLocal
from app.db.models import Relationship

# BOT CONFIG
TOKEN = "8850504953:AAGj5U4FQFgBR_9E7sZZkCdSWSeMcpxgMyg"
CHAT_ID = "1809622937"

def send_telegram_alert(message: str):
    print(f"📡 Sending Telegram request...")
    url = f"https://api.telegram.org/bot{TOKEN}/sendMessage"
    payload = {"chat_id": CHAT_ID, "text": message, "parse_mode": "Markdown"}
    try:
        resp = requests.post(url, json=payload)
        if resp.status_code == 200:
            print("✅ Telegram alert sent successfully!")
        else:
            print(f"❌ Telegram Error: {resp.text}")
    except Exception as e:
        print(f"❌ Connection Error: {e}")

def run_decay_test():
    db = SessionLocal()
    
    # 1. SETUP: Find any relationship and force it to be ACTIVE and OLD
    rel = db.query(Relationship).first()
    
    if not rel:
        print("❌ No relationships found in DB. Please run seed.py first.")
        return

    print(f"🔄 FORCING TEST STATE: Linkage {rel.id} ({rel.source_entity.name} -> {rel.target_entity.name})")
    rel.status = "ACTIVE"
    # Warp back 50 days
    rel.last_interaction_at = datetime.now() - timedelta(days=50)
    db.commit()
    print(f"⏳ Time Warp complete: Last interaction set to {rel.last_interaction_at}")

    # 2. MONITOR LOGIC: Check for decay
    print("🕵️  Running Decay Monitor logic...")
    
    # Calculate days idle
    # Handle timezone awareness (SQLite usually gives naive datetimes)
    li_at = rel.last_interaction_at
    if li_at.tzinfo is None:
        li_at = li_at.replace(tzinfo=None)
        now = datetime.now()
    else:
        now = datetime.now(timezone.utc)

    days_idle = (now - li_at).days
    
    # Calculate Health Score (Decay 2.0% per day idle)
    health = max(0.0, 100.0 - (days_idle * 2.0))
    rel.health_score = health
    
    print(f"📊 Results: {days_idle} days idle | Calculated Health: {health}%")

    # 3. TRIGGER: Send alert if health is below threshold or days > 45
    if days_idle >= 45:
        print("🚨 THRESHOLD BREACHED! Preparing alert...")
        rel.status = "DECAYING"
        
        alert_msg = (
            f"⚠️ *Ecosystem Health Alert*\n\n"
            f"*Linkage ID:* {rel.id}\n"
            f"*Entities:* {rel.source_entity.name} ↔️ {rel.target_entity.name}\n"
            f"*Status:* DECAYING\n"
            f"*Health Score:* {health}%\n"
            f"*Inactivity:* {days_idle} days\n\n"
            f"Action: Consider re-routing this mentorship."
        )
        send_telegram_alert(alert_msg)
    
    db.commit()
    db.close()
    print("🏁 Test finished.")

if __name__ == "__main__":
    run_decay_test()