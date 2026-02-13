"""
Telegram Bot Notifier — sends CRM notifications to Telegram.
Config loaded from environment variables (backend/.env).
"""
import os
import httpx
from dotenv import load_dotenv

load_dotenv()

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")
TELEGRAM_API = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}"


def is_configured() -> bool:
    """Check if Telegram is properly configured."""
    return bool(TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID)


async def send_notification(message: str, parse_mode: str = "HTML") -> dict:
    """
    Send a notification message to the configured Telegram chat.
    Returns {"success": True/False, "error": "..."}.
    """
    if not is_configured():
        return {"success": False, "error": "Telegram not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env"}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{TELEGRAM_API}/sendMessage",
                json={
                    "chat_id": TELEGRAM_CHAT_ID,
                    "text": message,
                    "parse_mode": parse_mode,
                },
            )

            data = response.json()
            if data.get("ok"):
                return {"success": True}
            else:
                return {"success": False, "error": data.get("description", "Unknown Telegram error")}

    except Exception as e:
        print(f"[Telegram] Error: {e}")
        return {"success": False, "error": str(e)}


async def notify_new_leads(count: int, source: str):
    """Notify about newly scraped leads."""
    msg = f"🔔 <b>{count} new leads</b> scraped from <b>{source}</b>"
    return await send_notification(msg)


async def notify_overdue_followup(lead_name: str, days_overdue: int):
    """Notify about overdue follow-ups."""
    msg = f"⚠️ <b>Follow-up overdue</b>\nLead: {lead_name}\nOverdue: {days_overdue} day(s)"
    return await send_notification(msg)


async def notify_invoice_paid(invoice_number: str, total: float):
    """Notify when an invoice is marked as paid."""
    formatted = f"Rp {total:,.0f}"
    msg = f"💰 <b>Invoice Paid!</b>\n#{invoice_number}\nTotal: {formatted}"
    return await send_notification(msg)
