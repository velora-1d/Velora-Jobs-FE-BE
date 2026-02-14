from fastapi import FastAPI, Depends, HTTPException, status, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from database import init_db, get_db, SessionLocal
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from datetime import timedelta
import asyncio
import os
from auth import verify_password, get_password_hash, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
from models import User, Lead, Setting

app = FastAPI(title="Velora Jobs API")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")

# Initialize database and default user
@app.on_event("startup")
def on_startup():
    init_db()
    
    # Create default user if not exists
    db = next(get_db())
    default_email = os.getenv("ADMIN_EMAIL", "email.jobs@velora.com")
    default_pass = os.getenv("ADMIN_PASSWORD", "admin123")
    
    try:
        user = db.query(User).filter(User.email == default_email).first()
        if not user:
            hashed_password = get_password_hash(default_pass)
            new_user = User(email=default_email, hashed_password=hashed_password)
            db.add(new_user)
            db.commit()
            print(f"Default user created: {default_email}")
        else:
            print("Default user already exists.")
    finally:
        db.close()

# Configure CORS
import os
origins = os.getenv("CORS_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    from jose import JWTError, jwt
    from auth import SECRET_KEY, ALGORITHM
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
    return user

@app.post("/api/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/")
async def root():
    return {"message": "Velora Jobs API is running"}

@app.get("/api/health")
async def health():
    return {"status": "healthy"}

# ──────────────────────────────────────────────
# GLOBAL SCRAPER STATE
# ──────────────────────────────────────────────
SCRAPER_LOGS = []
SCRAPER_RUNNING = False
SCRAPER_INTERRUPT = None # Will hold asyncio.Event

@app.get("/api/scrape/status")
async def scrape_status(current_user: User = Depends(get_current_user)):
    return {
        "running": SCRAPER_RUNNING,
        "logs": SCRAPER_LOGS[-50:] # Return last 50 lines
    }

@app.post("/api/scrape/stop")
async def stop_scrape(current_user: User = Depends(get_current_user)):
    global SCRAPER_INTERRUPT, SCRAPER_RUNNING
    if SCRAPER_RUNNING and SCRAPER_INTERRUPT:
        SCRAPER_INTERRUPT.set()
        log_message("🛑 Stopping scraper by user request...")
        return {"message": "Stopping scraper..."}
    return {"message": "Scraper not running"}

def log_message(msg: str):
    """Add message to global logs"""
    from datetime import datetime
    timestamp = datetime.now().strftime("%H:%M:%S")
    SCRAPER_LOGS.append(f"[{timestamp}] {msg}")
    # Keep log size manageable
    if len(SCRAPER_LOGS) > 200:
        SCRAPER_LOGS.pop(0)

@app.get("/api/scrape")
async def scrape(
    background_tasks: BackgroundTasks,
    keywords: str = "Fullstack Developer",
    location: str = "Indonesia",
    sources: str = "linkedin,upwork,indeed,glints,gmaps",
    limit: int = 10, 
    safe_mode: bool = False,
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    global SCRAPER_RUNNING, SCRAPER_INTERRUPT, SCRAPER_LOGS
    
    if SCRAPER_RUNNING:
        return {"message": "Scraper is already running", "status": "running"}

    try:
        # Reset State
        SCRAPER_LOGS.clear()
        SCRAPER_RUNNING = True
        SCRAPER_INTERRUPT = asyncio.Event()
        
        # Fetch settings
        settings = {s.key: s.value for s in db.query(Setting).all()}
        li_cookie = settings.get("linkedin_cookie", "")
        proxy_url = os.getenv("PROXY_URL", settings.get("proxy_url", ""))
        
        # Parse sources
        source_list = [s.strip().lower() for s in sources.split(",") if s.strip()]
        
        background_tasks.add_task(
            run_scraper_task, 
            keywords, 
            location, 
            source_list, 
            limit, 
            safe_mode, 
            li_cookie, 
            proxy_url, 
            SCRAPER_INTERRUPT
        )

        return {"message": "Scraping started", "status": "started"}
    except Exception as e:
        SCRAPER_RUNNING = False
        raise HTTPException(status_code=500, detail=f"Failed to start scraper: {str(e)}")

async def run_scraper_task(keywords, location, sources, limit, safe_mode, cookie, proxy, interrupt_event):
    global SCRAPER_RUNNING
    from scraper import JobScraper
    from ai_scorer import score_lead
    from database import SessionLocal

    log_message(f"🚀 Starting background scrape for '{keywords}'")
    
    scraper = JobScraper(
        headless=True,
        cookie=cookie,
        proxy=proxy,
        safe_mode=safe_mode,
        log_callback=log_message,
        interrupt_event=interrupt_event
    )
    
    db = SessionLocal()
    try:
        results = await scraper.scrape_all(keywords, location, sources, limit=limit)
        
        saved_count = 0
        for item in results:
            if interrupt_event.is_set(): 
                log_message("🛑 Loop interrupted, stopping save...")
                break
            
            # Check for duplicates using the local session
            existing = db.query(Lead).filter(Lead.url == item['url']).first()
            if not existing:
                log_message(f"✨ New lead found: {item['title']} @ {item['company']}")
                # Score with AI
                try:
                    ai_result = await score_lead(
                        title=item['title'],
                        company=item['company'],
                        description=item.get('description', ''),
                    )
                except Exception as ai_e:
                    log_message(f"⚠️ AI Scorer error: {str(ai_e)}")
                    ai_result = {"score": 0, "reason": "AI scoring failed"}
                
                new_lead = Lead(
                    title=item['title'],
                    company=item['company'],
                    location=item['location'],
                    description=item.get('description', ''),
                    url=item['url'],
                    source=item['source'],
                    match_score=ai_result['score'],
                    match_reason=ai_result['reason'],
                    phone=item.get('phone', ''),
                    has_website=item.get('has_website'),
                    status="new",
                )
                db.add(new_lead)
                saved_count += 1
        
        db.commit()
        log_message(f"🎉 Scraping finished! Saved {saved_count} new leads.")

        # Telegram notification
        if saved_count > 0:
            from telegram_notifier import notify_new_leads, is_configured
            if is_configured():
                await notify_new_leads(saved_count, ", ".join(sources))
                
    except Exception as e:
        log_message(f"❌ Error during scraping: {str(e)}")
        import traceback
        print(traceback.format_exc()) # Still logged to Docker stdout
    finally:
        db.close()
        SCRAPER_RUNNING = False
        log_message("💤 Scraper task ended.")

@app.get("/api/leads")
async def get_leads(
    start_date: str = None,
    end_date: str = None,
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    from models import Lead
    from datetime import datetime, time

    query = db.query(Lead)

    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date)
            # Ensure start of day
            start_dt = datetime.combine(start_dt.date(), time.min)
            query = query.filter(Lead.created_at >= start_dt)
        except ValueError:
            pass # Ignore invalid date format
            
    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date)
            # Ensure end of day
            end_dt = datetime.combine(end_dt.date(), time.max)
            query = query.filter(Lead.created_at <= end_dt)
        except ValueError:
            pass

    return query.order_by(Lead.id.desc()).all()

@app.post("/api/leads")
async def create_lead(payload: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from models import Lead
    
    lead = Lead(
        title=payload.get("title", "New Lead"),
        company=payload.get("company", "Unknown"),
        location=payload.get("location", ""),
        description=payload.get("description", ""),
        url=payload.get("url", ""),
        source=payload.get("source", "Manual"),
        status=payload.get("status", "new"),
        email=payload.get("email"),
        phone=payload.get("phone"),
        rating=payload.get("rating"),
        match_score=payload.get("match_score"),
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return {"id": lead.id, "status": "created"}

@app.put("/api/leads/{lead_id}")
async def update_lead(lead_id: int, payload: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from models import Lead
    
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    for key, value in payload.items():
        if hasattr(lead, key):
            setattr(lead, key, value)
            
    db.commit()
    return {"id": lead.id, "status": "updated"}

@app.delete("/api/leads/{lead_id}")
async def delete_lead(lead_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from models import Lead, FollowUp, Project, Campaign
    
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
        
    # Cascade delete related items (optional, but good for cleanup)
    db.query(FollowUp).filter(FollowUp.lead_id == lead_id).delete()
    db.query(Project).filter(Project.lead_id == lead_id).delete()
    
    db.delete(lead)
    db.commit()
    return {"status": "deleted"}

# --- Settings API ---

@app.get("/api/settings")
async def get_settings(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from models import Setting
    settings_db = {s.key: s.value for s in db.query(Setting).all()}
    
    # Base response is all DB settings
    response = settings_db.copy()
    
    # Overlay system-managed values for UI awareness
    response.update({
        "linkedin_cookie": settings_db.get("linkedin_cookie", ""),
        "openai_api_key": os.getenv("AI_API_KEY", settings_db.get("openai_api_key", "")),
        "openai_model": os.getenv("AI_MODEL", settings_db.get("openai_model", "")),
        "fonnte_token": os.getenv("FONNTE_TOKEN", settings_db.get("fonnte_token", "")),
        "proxy_url": os.getenv("PROXY_URL", settings_db.get("proxy_url", "")),
        "is_ai_managed": os.getenv("AI_API_KEY") is not None,
        "is_wa_managed": os.getenv("FONNTE_TOKEN") is not None,
        "is_proxy_managed": os.getenv("PROXY_URL") is not None,
    })
    return response

@app.post("/api/settings")
async def update_settings(config: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from models import Setting
    
    for key, value in config.items():
        setting = db.query(Setting).filter(Setting.key == key).first()
        if not setting:
            setting = Setting(key=key, value=str(value))
            db.add(setting)
        else:
            setting.value = str(value)
    
    db.commit()
    return {"status": "updated", "config": config}

# --- WhatsApp (Fonnte) API ---

@app.post("/api/wa/send")
async def send_whatsapp(payload: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Send WhatsApp message via Fonnte API."""
    import httpx
    from models import Setting, Lead
    
    target = payload.get("target", "")
    message = payload.get("message", "")
    lead_id = payload.get("lead_id")
    
    if not target or not message:
        return {"success": False, "error": "target and message required"}
    
    # Get Fonnte token: env var first, then DB settings
    fonnte_token = os.getenv("FONNTE_TOKEN", "")
    if not fonnte_token:
        settings = {s.key: s.value for s in db.query(Setting).all()}
        fonnte_token = settings.get("fonnte_token", "")
    
    if not fonnte_token:
        return {"success": False, "error": "Fonnte token not configured. Set FONNTE_TOKEN in .env or go to Settings."}
    
    # Format phone number
    phone = target.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    if phone.startswith("0"):
        phone = "62" + phone[1:]
    if phone.startswith("+"):
        phone = phone[1:]
    
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                "https://api.fonnte.com/send",
                headers={
                    "Authorization": fonnte_token,
                },
                data={
                    "target": phone,
                    "message": message,
                    "delay": "2",
                    "countryCode": "62",
                },
            )
            result = response.json()
        
        # Update lead status if successful and lead_id provided
        if lead_id and result.get("status"):
            lead = db.query(Lead).filter(Lead.id == lead_id).first()
            if lead:
                lead.status = "contacted"
                db.commit()
        
        return {
            "success": result.get("status", False),
            "detail": result.get("detail", "Unknown"),
            "target": phone,
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

# ═══════════════════════════════════════════════════
# ──── FOLLOW-UP API ────
# ═══════════════════════════════════════════════════

@app.get("/api/followups")
async def get_followups(lead_id: int = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from models import FollowUp, Lead
    query = db.query(FollowUp).order_by(FollowUp.created_at.desc())
    if lead_id:
        query = query.filter(FollowUp.lead_id == lead_id)
    follow_ups = query.all()
    results = []
    for fu in follow_ups:
        lead = db.query(Lead).filter(Lead.id == fu.lead_id).first()
        results.append({
            "id": fu.id,
            "lead_id": fu.lead_id,
            "lead_title": lead.title if lead else "Unknown",
            "lead_company": lead.company if lead else "",
            "type": fu.type,
            "note": fu.note,
            "status": fu.status,
            "next_follow_date": str(fu.next_follow_date) if fu.next_follow_date else None,
            "created_at": fu.created_at.isoformat() if fu.created_at else None,
        })
    return results

@app.post("/api/followups")
async def create_followup(payload: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from models import FollowUp, Lead
    from datetime import date
    
    lead_id = payload.get("lead_id")
    if not lead_id:
        raise HTTPException(status_code=400, detail="lead_id is required")
    
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    next_date = None
    if payload.get("next_follow_date"):
        next_date = date.fromisoformat(payload["next_follow_date"])
    
    fu = FollowUp(
        lead_id=lead_id,
        type=payload.get("type", "wa"),
        note=payload.get("note", ""),
        status=payload.get("status", "pending"),
        next_follow_date=next_date,
    )
    db.add(fu)
    db.commit()
    db.refresh(fu)
    return {"id": fu.id, "status": "created"}

@app.put("/api/followups/{fu_id}")
async def update_followup(fu_id: int, payload: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from models import FollowUp
    from datetime import date
    
    fu = db.query(FollowUp).filter(FollowUp.id == fu_id).first()
    if not fu:
        raise HTTPException(status_code=404, detail="Follow-up not found")
    
    if "type" in payload: fu.type = payload["type"]
    if "note" in payload: fu.note = payload["note"]
    if "status" in payload: fu.status = payload["status"]
    if "next_follow_date" in payload:
        fu.next_follow_date = date.fromisoformat(payload["next_follow_date"]) if payload["next_follow_date"] else None
    
    db.commit()
    return {"id": fu.id, "status": "updated"}

@app.delete("/api/followups/{fu_id}")
async def delete_followup(fu_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from models import FollowUp
    
    fu = db.query(FollowUp).filter(FollowUp.id == fu_id).first()
    if not fu:
        raise HTTPException(status_code=404, detail="Follow-up not found")
        
    db.delete(fu)
    db.commit()
    return {"status": "deleted"}

# ═══════════════════════════════════════════════════
# ──── PROJECT API ────
# ═══════════════════════════════════════════════════

@app.get("/api/projects")
async def get_projects(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from models import Project, Lead, Invoice
    projects = db.query(Project).order_by(Project.created_at.desc()).all()
    results = []
    for p in projects:
        lead = db.query(Lead).filter(Lead.id == p.lead_id).first()
        invoice_count = db.query(Invoice).filter(Invoice.project_id == p.id).count()
        total_invoiced = sum(i.total for i in db.query(Invoice).filter(Invoice.project_id == p.id).all())
        total_paid = sum(i.total for i in db.query(Invoice).filter(Invoice.project_id == p.id, Invoice.status == "paid").all())
        results.append({
            "id": p.id,
            "lead_id": p.lead_id,
            "lead_title": lead.title if lead else "Unknown",
            "lead_company": lead.company if lead else "",
            "name": p.name,
            "description": p.description,
            "status": p.status,
            "budget": p.budget,
            "deadline": str(p.deadline) if p.deadline else None,
            "progress": p.progress,
            "invoice_count": invoice_count,
            "total_invoiced": total_invoiced,
            "total_paid": total_paid,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        })
    return results

@app.post("/api/projects")
async def create_project(payload: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from models import Project, Lead
    from datetime import date
    
    lead_id = payload.get("lead_id")
    name = payload.get("name")
    if not lead_id or not name:
        raise HTTPException(status_code=400, detail="lead_id and name required")
    
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Update lead status to won
    lead.status = "won"
    
    deadline = None
    if payload.get("deadline"):
        deadline = date.fromisoformat(payload["deadline"])
    
    project = Project(
        lead_id=lead_id,
        name=name,
        description=payload.get("description", ""),
        status=payload.get("status", "negotiation"),
        budget=payload.get("budget"),
        deadline=deadline,
        progress=0,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return {"id": project.id, "status": "created"}

@app.put("/api/projects/{project_id}")
async def update_project(project_id: int, payload: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from models import Project
    from datetime import date
    
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if "name" in payload: project.name = payload["name"]
    if "description" in payload: project.description = payload["description"]
    if "status" in payload: project.status = payload["status"]
    if "budget" in payload: project.budget = payload["budget"]
    if "progress" in payload: project.progress = payload["progress"]
    if "deadline" in payload:
        project.deadline = date.fromisoformat(payload["deadline"]) if payload["deadline"] else None
    
    db.commit()
    return {"id": project.id, "status": "updated"}

@app.delete("/api/projects/{project_id}")
async def delete_project(project_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from models import Project, Invoice
    
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Cascade delete invoices
    db.query(Invoice).filter(Invoice.project_id == project_id).delete()
    
    db.delete(project)
    db.commit()
    return {"status": "deleted"}

# ═══════════════════════════════════════════════════
# ──── INVOICE API ────
# ═══════════════════════════════════════════════════

@app.get("/api/invoices")
async def get_invoices(project_id: int = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from models import Invoice, Project, Lead
    import json
    
    query = db.query(Invoice).order_by(Invoice.created_at.desc())
    if project_id:
        query = query.filter(Invoice.project_id == project_id)
    invoices = query.all()
    
    results = []
    for inv in invoices:
        project = db.query(Project).filter(Project.id == inv.project_id).first()
        lead = db.query(Lead).filter(Lead.id == project.lead_id).first() if project else None
        results.append({
            "id": inv.id,
            "project_id": inv.project_id,
            "project_name": project.name if project else "Unknown",
            "client_name": lead.company if lead else "Unknown",
            "invoice_number": inv.invoice_number,
            "items": json.loads(inv.items) if inv.items else [],
            "subtotal": inv.subtotal,
            "tax_percent": inv.tax_percent,
            "total": inv.total,
            "status": inv.status,
            "due_date": str(inv.due_date) if inv.due_date else None,
            "paid_at": inv.paid_at.isoformat() if inv.paid_at else None,
            "notes": inv.notes,
            "created_at": inv.created_at.isoformat() if inv.created_at else None,
        })
    return results

@app.post("/api/invoices")
async def create_invoice(payload: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from models import Invoice, Project
    from datetime import date
    import json
    
    project_id = payload.get("project_id")
    if not project_id:
        raise HTTPException(status_code=400, detail="project_id required")
    
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Auto-generate invoice number: INV-YYYYMM-NNN
    from datetime import datetime
    now = datetime.utcnow()
    count = db.query(Invoice).count() + 1
    inv_number = payload.get("invoice_number") or f"INV-{now.strftime('%Y%m')}-{count:03d}"
    
    items = payload.get("items", [])
    items_json = json.dumps(items)
    subtotal = sum(item.get("qty", 1) * item.get("price", 0) for item in items)
    tax_pct = payload.get("tax_percent", 0)
    total = subtotal + (subtotal * tax_pct / 100)
    
    due_date = None
    if payload.get("due_date"):
        due_date = date.fromisoformat(payload["due_date"])
    
    invoice = Invoice(
        project_id=project_id,
        invoice_number=inv_number,
        items=items_json,
        subtotal=subtotal,
        tax_percent=tax_pct,
        total=total,
        status="draft",
        due_date=due_date,
        notes=payload.get("notes", ""),
    )
    db.add(invoice)
    db.commit()
    db.refresh(invoice)
    return {"id": invoice.id, "invoice_number": inv_number, "total": total, "status": "created"}

@app.put("/api/invoices/{inv_id}")
async def update_invoice(inv_id: int, payload: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from models import Invoice
    from datetime import date, datetime
    import json
    
    inv = db.query(Invoice).filter(Invoice.id == inv_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    if "status" in payload:
        inv.status = payload["status"]
        if payload["status"] == "paid":
            from models import get_wib_now
            inv.paid_at = get_wib_now()
            # Telegram notification for paid invoice
            from telegram_notifier import notify_invoice_paid, is_configured as tg_configured
            if tg_configured():
                await notify_invoice_paid(inv.invoice_number, inv.total)
    if "items" in payload:
        inv.items = json.dumps(payload["items"])
        inv.subtotal = sum(item.get("qty", 1) * item.get("price", 0) for item in payload["items"])
        inv.total = inv.subtotal + (inv.subtotal * inv.tax_percent / 100)
    if "tax_percent" in payload:
        inv.tax_percent = payload["tax_percent"]
        inv.total = inv.subtotal + (inv.subtotal * inv.tax_percent / 100)
    if "due_date" in payload:
        inv.due_date = date.fromisoformat(payload["due_date"]) if payload["due_date"] else None
    if "notes" in payload:
        inv.notes = payload["notes"]
    
    db.commit()
    return {"id": inv.id, "status": "updated"}

@app.delete("/api/invoices/{inv_id}")
async def delete_invoice(inv_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from models import Invoice
    
    inv = db.query(Invoice).filter(Invoice.id == inv_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    db.delete(inv)
    db.commit()
    return {"status": "deleted"}

# ─── Dashboard Stats ───

@app.get("/api/stats")
async def get_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from models import Lead, FollowUp, Project, Invoice
    
    total_leads = db.query(Lead).count()
    new_leads = db.query(Lead).filter(Lead.status == "new").count()
    contacted = db.query(Lead).filter(Lead.status == "contacted").count()
    won = db.query(Lead).filter(Lead.status == "won").count()
    
    active_projects = db.query(Project).filter(Project.status == "active").count()
    total_projects = db.query(Project).count()
    
    pending_followups = db.query(FollowUp).filter(FollowUp.status == "pending").count()
    
    total_revenue = sum(i.total for i in db.query(Invoice).filter(Invoice.status == "paid").all())
    unpaid_invoices = db.query(Invoice).filter(Invoice.status.in_(["sent", "overdue"])).count()
    
    return {
        "total_leads": total_leads,
        "new_leads": new_leads,
        "contacted": contacted,
        "won": won,
        "active_projects": active_projects,
        "total_projects": total_projects,
        "pending_followups": pending_followups,
        "total_revenue": total_revenue,
        "unpaid_invoices": unpaid_invoices,
    }

# --- Telegram ---

@app.post("/api/telegram/test")
async def test_telegram(current_user: User = Depends(get_current_user)):
    """Send a test notification to verify Telegram is configured."""
    from telegram_notifier import send_notification, is_configured
    if not is_configured():
        return {"success": False, "error": "Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in backend/.env"}
    result = await send_notification("✅ <b>Velora Jobs</b> — Telegram connected successfully!")
    return result

# --- Data Export (CSV) ---

@app.get("/api/export/leads")
async def export_leads(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from models import Lead
    from fastapi.responses import StreamingResponse
    import csv, io
    
    leads = db.query(Lead).order_by(Lead.id.desc()).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Title", "Company", "Location", "Source", "Status", "Score", "Reason", "Phone", "URL", "Created"])
    for l in leads:
        writer.writerow([l.id, l.title, l.company, l.location, l.source, l.status, l.match_score, l.match_reason, getattr(l, 'phone', ''), l.url, str(l.created_at)])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=leads_export.csv"}
    )

@app.get("/api/export/projects")
async def export_projects(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from models import Project
    from fastapi.responses import StreamingResponse
    import csv, io
    
    projects = db.query(Project).order_by(Project.id.desc()).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Name", "Client", "Status", "Budget", "Progress", "Deadline", "Created"])
    for p in projects:
        writer.writerow([p.id, p.name, p.client_name, p.status, p.budget, p.progress, str(p.deadline) if p.deadline else "", str(p.created_at)])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=projects_export.csv"}
    )

@app.get("/api/export/invoices")
async def export_invoices(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from models import Invoice
    from fastapi.responses import StreamingResponse
    import csv, io
    
    invoices = db.query(Invoice).order_by(Invoice.id.desc()).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Invoice#", "Project_ID", "Subtotal", "Tax%", "Total", "Status", "Due_Date", "Paid_At", "Created"])
    for inv in invoices:
        writer.writerow([inv.id, inv.invoice_number, inv.project_id, inv.subtotal, inv.tax_percent, inv.total, inv.status, str(inv.due_date) if inv.due_date else "", str(inv.paid_at) if inv.paid_at else "", str(inv.created_at)])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=invoices_export.csv"}
    )

# ═══════════════════════════════════════════════════
# ──── CAMPAIGN API ────
# ═══════════════════════════════════════════════════

@app.get("/api/campaigns")
async def get_campaigns(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from models import Campaign
    return db.query(Campaign).order_by(Campaign.created_at.desc()).all()

@app.post("/api/campaigns")
async def create_campaign(payload: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from models import Campaign
    from datetime import datetime
    
    scheduled_at = None
    if payload.get("scheduled_at"):
        try:
            scheduled_at = datetime.fromisoformat(payload["scheduled_at"])
        except ValueError:
            pass
            
    camp = Campaign(
        name=payload.get("name", "New Campaign"),
        status="draft",
        message_template=payload.get("message_template", ""),
        target_criteria=payload.get("target_criteria", "{}"),
        scheduled_at=scheduled_at
    )
    db.add(camp)
    db.commit()
    db.refresh(camp)
    db.refresh(camp)
    return {"id": camp.id, "status": "created"}

@app.put("/api/campaigns/{camp_id}")
async def update_campaign(camp_id: int, payload: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from models import Campaign
    from datetime import datetime
    
    camp = db.query(Campaign).filter(Campaign.id == camp_id).first()
    if not camp:
        raise HTTPException(status_code=404, detail="Campaign not found")
        
    if "name" in payload: camp.name = payload["name"]
    if "status" in payload: camp.status = payload["status"]
    if "message_template" in payload: camp.message_template = payload["message_template"]
    if "target_criteria" in payload: camp.target_criteria = payload["target_criteria"]
    if "scheduled_at" in payload:
        try:
            camp.scheduled_at = datetime.fromisoformat(payload["scheduled_at"]) if payload["scheduled_at"] else None
        except:
            pass
            
    db.commit()
    return {"id": camp.id, "status": "updated"}

@app.delete("/api/campaigns/{camp_id}")
async def delete_campaign(camp_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from models import Campaign
    
    camp = db.query(Campaign).filter(Campaign.id == camp_id).first()
    if not camp:
        raise HTTPException(status_code=404, detail="Campaign not found")
        
    db.delete(camp)
    db.commit()
    return {"status": "deleted"}
