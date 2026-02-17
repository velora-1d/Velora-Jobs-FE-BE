import asyncio
import random
import json
import logging
from datetime import datetime
from sqlalchemy.orm import Session
from models import Campaign, Lead, FollowUp, get_wib_now

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CampaignRunner:
    def __init__(self):
        self.is_running = False
        self.stop_event = asyncio.Event()
        self.status = {
            "state": "idle",  # idle, running, paused, completed, error
            "campaign_id": None,
            "total": 0,
            "sent": 0,
            "failed": 0,
            "current_lead": None,
            "next_batch_at": None,
            "logs": []
        }

    def _log(self, message: str):
        """Add log to in-memory status and system logger."""
        timestamp = datetime.now().strftime("%H:%M:%S")
        log_entry = f"[{timestamp}] {message}"
        self.status["logs"].append(log_entry)
        # Keep only last 50 logs
        if len(self.status["logs"]) > 50:
            self.status["logs"].pop(0)
        logger.info(message)

    async def run_campaign(self, db: Session, campaign_id: int):
        """
        Execute a campaign securely with random delays and batching.
        """
        if self.is_running:
            self._log("⚠️ Campaign already running. Stop it first.")
            return

        self.is_running = True
        self.stop_event.clear()
        self.status = {
            "state": "running",
            "campaign_id": campaign_id,
            "total": 0,
            "sent": 0,
            "failed": 0,
            "current_lead": None,
            "next_batch_at": None,
            "logs": []
        }

        try:
            campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
            if not campaign:
                self._log("❌ Campaign not found.")
                self.is_running = False
                self.status["state"] = "error"
                return

            self._log(f"🚀 Starting Campaign: {campaign.name}")
            campaign.status = "running"
            db.commit()

            # 1. Fetch Targets
            criteria = json.loads(campaign.target_criteria or '{}')
            query = db.query(Lead)
            
            # Application of Filter Logic
            # "high_score": Score > 75
            if criteria.get("type") == "high_score":
                query = query.filter(Lead.match_score >= 75)
            
            # Exclude already won/lost to prevent spam
            query = query.filter(Lead.status.notin_(["won", "lost"]))
            
            leads = query.all()
            self.status["total"] = len(leads)
            self._log(f"🎯 Target Audience: {len(leads)} leads.")

            batch_count = 0
            BATCH_SIZE = 10 

            for i, lead in enumerate(leads):
                if self.stop_event.is_set():
                    self._log("🛑 Campaign stopped by user.")
                    break

                self.status["current_lead"] = lead.title
                
                # In real production, this would call Fonnte/WAbot API
                # For Phase 23, we use the real Fonnte integration
                success = await self._send_via_fonnte(lead, campaign.message_template, smart_ai=campaign.smart_ai)
                
                if success:
                    self.status["sent"] += 1
                    # Record as FollowUp
                    followup = FollowUp(
                        lead_id=lead.id,
                        type="wa_campaign",
                        note=f"Sent via Campaign: {campaign.name}",
                        status="done",
                        created_at=get_wib_now()
                    )
                    db.add(followup)
                    db.commit()
                else:
                    self.status["failed"] += 1

                batch_count += 1

                # SMART BATCHING: Sleep 5-10 mins after every 10 messages
                if batch_count >= BATCH_SIZE and i < len(leads) - 1:
                    sleep_time = random.uniform(300, 600) # 5-10 mins
                    minutes = int(sleep_time / 60)
                    self.status["next_batch_at"] = datetime.now().isoformat()
                    self._log(f"☕ Human Break: Sleeping for {minutes} mins to avoid blocking...")
                    await asyncio.sleep(sleep_time)
                    batch_count = 0 
                else:
                    # RANDOM JITTER: Sleep 15-45s between messages
                    delay = random.uniform(15, 45)
                    self._log(f"⏳ Waiting {int(delay)}s before next...")
                    await asyncio.sleep(delay)

            campaign.status = "completed"
            db.commit()
            self._log("✅ Campaign Completed Successfully.")

        except Exception as e:
            self._log(f"❌ Error: {str(e)}")
            self.status["state"] = "error"
        finally:
            self.is_running = False
            self.status["state"] = "idle"

    async def _send_via_fonnte(self, lead: Lead, template: str, smart_ai: bool = False):
        """
        Send a real message via Fonnte API.
        If smart_ai=True, generate a unique message for this recipient.
        """
        import os
        token = os.getenv("FONNTE_TOKEN")
        if not token:
            self._log("❌ FONNTE_TOKEN not found in environment.")
            return False

        try:
            message = ""
            if smart_ai:
                from ai_scorer import generate_personalized_message
                # Convert lead to dict for the AI function
                lead_data = {
                    "name": lead.title,
                    "company": lead.company,
                    "category": getattr(lead, 'category', ''),
                    "address": getattr(lead, 'location', ''),
                    "has_website": getattr(lead, 'has_website', True),
                    "phone": lead.phone
                }
                self._log(f"🧠 AI is crafting a unique message for {lead.company or lead.title}...")
                message = await generate_personalized_message(lead_data)
            else:
                # Standard template replacement
                message = template.replace("{name}", lead.title or "Partner") \
                                  .replace("{company}", lead.company or "")
            
            self._log(f"📤 Sending to {lead.phone or 'No Phone'} ({lead.company})...")
            
            # Validation: Must have phone
            if not lead.phone:
                self._log("⚠️ No phone number, skipped.")
                return False

            # Fonnte API Request
            import httpx
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.fonnte.com/send",
                    headers={"Authorization": token},
                    data={
                        "target": lead.phone,
                        "message": message,
                        "countryCode": "62", # Default to ID
                    },
                    timeout=20.0 # Increase timeout for AI lag potentially
                )
                
                res_data = response.json()
                if response.status_code == 200 and res_data.get("status"):
                    return True
                else:
                    self._log(f"⚠️ Fonnte Error: {res_data.get('reason', 'Unknown error')}")
                    return False

        except Exception as e:
            self._log(f"⚠️ Failed to send: {str(e)}")
            return False

    def stop(self):
        """Request to stop the campaign."""
        if self.is_running:
            self.stop_event.set()
            self._log("🛑 Stop verified. Finishing current step...")

# Global Runner Instance
campaign_runner = CampaignRunner()
