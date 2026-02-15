from fastapi import FastAPI, Depends, HTTPException, status, BackgroundTasks, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from database import init_db, get_db, SessionLocal
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from datetime import timedelta
import asyncio
import os
from auth import verify_password, get_password_hash, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
from models import User, Lead, Setting, Prospect
import schemas
from typing import List

app = FastAPI(title="Velora Jobs API")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")

# Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Content-Security-Policy"] = "default-src 'self'"
    return response

# Initialize database and default user
@app.on_event("startup")
def on_startup():
    init_db()
    
    # Create default user if not exists
    db = next(get_db())
    default_email = os.getenv("ADMIN_EMAIL")
    default_pass = os.getenv("ADMIN_PASSWORD")
    
    try:
        user = db.query(User).filter(User.email == default_email).first()
        if not user and default_email and default_pass:
            hashed_password = get_password_hash(default_pass)
            new_user = User(email=default_email, hashed_password=hashed_password)
            db.add(new_user)
            db.commit()
            print(f"Default user created: {default_email}")
        else:
            print("Default user check complete.")
    finally:
        db.close()

# Configure CORS
import os
origins = os.getenv("CORS_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True, # Changed to True for frontend to backend comms if needed (verify)
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
async def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
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
    import asyncio
    from database import SessionLocal

    is_gmaps = 'gmaps' in sources
    log_message(f"🚀 Starting background scrape for '{keywords}' ({'Prospects' if is_gmaps else 'Jobs'} mode)")
    
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
        
        saved_leads = 0
        saved_prospects = 0
        
        for item in results:
            if interrupt_event.is_set(): 
                log_message("🛑 Loop interrupted, stopping save...")
                break
            
            source = item.get('source', '')
            
            # ── Google Maps → save to PROSPECTS table ──
            if source == 'Google Maps':
                maps_url = item.get('maps_url', '')
                if maps_url:
                    existing = db.query(Prospect).filter(Prospect.maps_url == maps_url).first()
                else:
                    existing = None
                
                if not existing:
                    log_message(f"✨ New prospect: {item['name']} | Phone: {item.get('phone', '-')}")
                    # Score with AI
                    try:
                        ai_result = await score_lead(
                            title=item['name'],
                            company=item.get('category', 'Local Business'),
                            description=f"Category: {item.get('category', '')} | Address: {item.get('address', '')}",
                            has_website=item.get('has_website', False),
                            category=item.get('category', '')
                        )
                    except Exception as ai_e:
                        log_message(f"⚠️ AI Scorer error: {str(ai_e)}")
                        ai_result = {"score": 0, "reason": "AI scoring failed"}
                    
                    new_prospect = Prospect(
                        name=item['name'],
                        category=item.get('category', 'Local Business'),
                        address=item.get('address', ''),
                        phone=item.get('phone', ''),
                        email=item.get('email', ''),
                        website=item.get('website', ''),
                        has_website=item.get('has_website', False),
                        rating=item.get('rating'),
                        review_count=item.get('review_count'),
                        maps_url=maps_url,
                        match_score=ai_result['score'],
                        match_reason=ai_result['reason'],
                        source_keyword=item.get('source_keyword', keywords),
                        status="new",
                    )
                    db.add(new_prospect)
                    saved_prospects += 1
                else:
                    log_message(f"⏭️ Duplicate prospect (skip): {item['name']}")
            
            # ── Other sources → save to LEADS table (as before) ──
            else:
                existing = db.query(Lead).filter(Lead.url == item['url']).first()
                if not existing:
                    log_message(f"✨ New lead found: {item['title']} @ {item['company']}")
                    try:
                        ai_result = await score_lead(
                            title=item['title'],
                            company=item['company'],
                            description=item.get('description', ''),
                            has_website=item.get('has_website', True),
                            category=item.get('company', '')
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
                    saved_leads += 1
        
        db.commit()
        
        total = saved_leads + saved_prospects
        if saved_prospects > 0:
            log_message(f"🎉 Scraping finished! Saved {saved_prospects} new prospects.")
        if saved_leads > 0:
            log_message(f"🎉 Scraping finished! Saved {saved_leads} new leads.")
        if total == 0:
            log_message(f"📭 Scraping finished. No new data found (all duplicates).")

        # Telegram notification
        if total > 0:
            from telegram_notifier import notify_new_leads, is_configured
            if is_configured():
                await notify_new_leads(total, ", ".join(sources))
                
    except Exception as e:
        log_message(f"❌ Error during scraping: {str(e)}")
        import traceback
        print(traceback.format_exc())
    finally:
        db.close()
        SCRAPER_RUNNING = False
        log_message("💤 Scraper task ended.")

@app.get("/api/leads", response_model=List[schemas.LeadResponse])
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

@app.get("/api/campaigns", response_model=List[schemas.CampaignResponse])
async def get_campaigns(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from models import Campaign
    camp = db.query(Campaign).order_by(Campaign.created_at.desc()).all()
    return camp

@app.post("/api/campaigns", response_model=schemas.CampaignResponse)
async def create_campaign(campaign_in: schemas.CampaignCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from models import Campaign
    
    # Logic similar to before, but validation handled by Pydantic
    camp = Campaign(
        name=campaign_in.name,
        status=campaign_in.status,
        message_template=campaign_in.message_template,
        target_criteria=campaign_in.target_criteria,
        scheduled_at=campaign_in.scheduled_at
    )
    db.add(camp)
    db.commit()
    db.refresh(camp)
    return camp

@app.put("/api/campaigns/{id}", response_model=schemas.CampaignResponse)
async def update_campaign(id: int, campaign_in: schemas.CampaignUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from models import Campaign
    
    camp = db.query(Campaign).filter(Campaign.id == id).first()
    if not camp:
        raise HTTPException(status_code=404, detail="Campaign not found")

    update_data = campaign_in.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(camp, key, value)
    
    db.commit()
    db.refresh(camp)
    return camp

@app.delete("/api/campaigns/{id}")
async def delete_campaign(id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from models import Campaign
    
    camp = db.query(Campaign).filter(Campaign.id == id).first()
    if not camp:
        raise HTTPException(status_code=404, detail="Campaign not found")
        
    db.delete(camp)
    db.commit()
    return {"status": "deleted"}

# ... (campaign runner endpoints remain same, as they use ID only)

@app.post("/api/leads", response_model=schemas.LeadResponse)
async def create_lead(lead_in: schemas.LeadCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from models import Lead
    
    lead = Lead(
        title=lead_in.title,
        company=lead_in.company,
        location=lead_in.location,
        description=lead_in.description,
        url=lead_in.url,
        source=lead_in.source,
        status=lead_in.status,
        email=lead_in.email,
        phone=lead_in.phone,
        rating=lead_in.rating,
        match_score=lead_in.match_score,
        match_reason=lead_in.match_reason,
        has_website=lead_in.has_website
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead

@app.put("/api/leads/{lead_id}", response_model=schemas.LeadResponse)
async def update_lead(lead_id: int, lead_in: schemas.LeadUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from models import Lead
    
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Update fields that are provided
    update_data = lead_in.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(lead, key, value)
            
    db.commit()
    db.refresh(lead)
    return lead

@app.delete("/api/leads/{lead_id}")
async def delete_lead(lead_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from models import Lead, FollowUp, Project, Campaign
    
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
        
    # Cascade delete related items (OR relies on DB cascade, but manual here for safety)
    db.query(FollowUp).filter(FollowUp.lead_id == lead_id).delete()
    db.query(Project).filter(Project.lead_id == lead_id).delete()
    
    db.delete(lead)
    db.commit()
    return {"status": "deleted"}

# ---------------------------------------------------------------------
# PROSPECT CRUD (Google Maps Business Prospects)
# ---------------------------------------------------------------------

@app.get("/api/prospects", response_model=List[schemas.ProspectResponse])
async def get_prospects(
    start_date: str = None,
    end_date: str = None, 
    category: str = None,
    status: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from datetime import datetime
    query = db.query(Prospect)
    
    if start_date:
        query = query.filter(Prospect.created_at >= datetime.fromisoformat(start_date))
    if end_date:
        query = query.filter(Prospect.created_at <= datetime.fromisoformat(end_date + "T23:59:59"))
    if category and category != "all":
        query = query.filter(Prospect.category.ilike(f"%{category}%"))
    if status and status != "all":
        query = query.filter(Prospect.status == status)
    
    return query.order_by(Prospect.created_at.desc()).all()

@app.get("/api/prospects/stats")
async def get_prospect_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from sqlalchemy import func
    total = db.query(func.count(Prospect.id)).scalar() or 0
    contacted = db.query(func.count(Prospect.id)).filter(Prospect.status == "contacted").scalar() or 0
    won = db.query(func.count(Prospect.id)).filter(Prospect.status == "won").scalar() or 0
    no_web = db.query(func.count(Prospect.id)).filter(Prospect.has_website == False).scalar() or 0
    return {
        "total": total,
        "contacted": contacted,
        "won": won,
        "without_website": no_web,
    }

@app.post("/api/prospects", response_model=schemas.ProspectResponse)
async def create_prospect(data: schemas.ProspectCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    prospect = Prospect(
        name=data.name,
        category=data.category,
        address=data.address,
        phone=data.phone,
        email=data.email,
        website=data.website,
        has_website=data.has_website,
        rating=data.rating,
        review_count=data.review_count,
        maps_url=data.maps_url,
        match_score=data.match_score,
        match_reason=data.match_reason,
        status=data.status,
        source_keyword=data.source_keyword,
    )
    db.add(prospect)
    db.commit()
    db.refresh(prospect)
    return prospect

@app.put("/api/prospects/{prospect_id}", response_model=schemas.ProspectResponse)
async def update_prospect(prospect_id: int, data: schemas.ProspectUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    prospect = db.query(Prospect).filter(Prospect.id == prospect_id).first()
    if not prospect:
        raise HTTPException(status_code=404, detail="Prospect not found")
    
    update_data = data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(prospect, key, value)
    
    db.commit()
    db.refresh(prospect)
    return prospect

@app.delete("/api/prospects/{prospect_id}")
async def delete_prospect(prospect_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    prospect = db.query(Prospect).filter(Prospect.id == prospect_id).first()
    if not prospect:
        raise HTTPException(status_code=404, detail="Prospect not found")
    
    db.delete(prospect)
    db.commit()
    return {"status": "deleted"}

# ---------------------------------------------------------------------
# CAMPAIGN RUNNER CONTROL
# ---------------------------------------------------------------------

@app.post("/api/campaigns/{id}/launch")
async def launch_campaign(id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    if campaign_runner.is_running:
        raise HTTPException(status_code=400, detail="A campaign is already running.")
    
    # Verify campaign exists
    camp = db.query(Campaign).filter(Campaign.id == id).first()
    if not camp:
        raise HTTPException(status_code=404, detail="Campaign not found.")
    
    # Start in background
    background_tasks.add_task(campaign_runner.run_campaign, db, id)
    return {"status": "started", "campaign": camp.name}

@app.get("/api/campaigns/status")
def get_campaign_status():
    return campaign_runner.status

@app.post("/api/campaigns/stop")
def stop_campaign():
    campaign_runner.stop()
    return {"status": "stopping"}
@app.post("/api/send-wa")
async def send_wa_individual(payload: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Send a single WhatsApp message via Fonnte."""
    phone = payload.get("phone")
    message = payload.get("message")
    lead_id = payload.get("lead_id")

    if not phone or not message:
        raise HTTPException(status_code=400, detail="Phone and message are required")

    from campaign_runner import campaign_runner
    success = await campaign_runner._send_via_fonnte(
        Lead(phone=phone, title="Contact", company=""), # Temporary object for helper
        message
    )

    if success and lead_id:
        # Record as FollowUp
        from models import FollowUp, get_wib_now
        followup = FollowUp(
            lead_id=lead_id,
            type="wa_individual",
            note="Sent via Individual Outreach",
            status="done",
            created_at=get_wib_now()
        )
        db.add(followup)
        db.commit()

    return {"success": success}
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
async def update_settings(config: schemas.SettingsUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from models import Setting
    
    # Convert Pydantic model to dict, exclude None to allow partial updates if needed,
    # but here we usually send full form.
    config_dict = config.dict(exclude_unset=True)
    
    for key, value in config_dict.items():
        if value is None: continue 
        
        setting = db.query(Setting).filter(Setting.key == key).first()
        if not setting:
            setting = Setting(key=key, value=str(value))
            db.add(setting)
        else:
            setting.value = str(value)
    
    db.commit()
    return {"status": "updated", "config": config_dict}

# --- WhatsApp (Fonnte) API ---

@app.post("/api/wa/send")
async def send_whatsapp(payload: schemas.WhatsAppSend, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Send WhatsApp message via Fonnte API."""
    import httpx
    from models import Setting, Lead
    
    target = payload.target
    message = payload.message
    lead_id = payload.lead_id
    
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

@app.get("/api/followups", response_model=List[schemas.FollowUpResponse])
async def get_followups(lead_id: int = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from models import FollowUp, Lead
    from sqlalchemy.orm import joinedload
    
    query = db.query(FollowUp).options(joinedload(FollowUp.lead)).order_by(FollowUp.created_at.desc())
    
    if lead_id:
        query = query.filter(FollowUp.lead_id == lead_id)
    follow_ups = query.all()
    
    # Map to schema (Pydantic orm_mode handles most, but we need flattened fields)
    results = []
    for fu in follow_ups:
        results.append({
            "id": fu.id,
            "lead_id": fu.lead_id,
            "lead_title": fu.lead.title if fu.lead else "Unknown",
            "lead_company": fu.lead.company if fu.lead else "",
            "type": fu.type,
            "note": fu.note,
            "status": fu.status,
            "next_follow_date": fu.next_follow_date,
            "created_at": fu.created_at,
            "updated_at": fu.updated_at
        })
    return results

@app.post("/api/followups", response_model=schemas.FollowUpResponse)
async def create_followup(fu_in: schemas.FollowUpCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from models import FollowUp, Lead
    
    lead = db.query(Lead).filter(Lead.id == fu_in.lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    fu = FollowUp(
        lead_id=fu_in.lead_id,
        type=fu_in.type,
        note=fu_in.note,
        status=fu_in.status,
        next_follow_date=fu_in.next_follow_date,
    )
    db.add(fu)
    db.commit()
    db.refresh(fu)
    
    # Return with manual mapping for flattened fields
    return {
        "id": fu.id,
        "lead_id": fu.lead_id,
        "lead_title": lead.title,
        "lead_company": lead.company,
        "type": fu.type,
        "note": fu.note,
        "status": fu.status,
        "next_follow_date": fu.next_follow_date,
        "created_at": fu.created_at,
        "updated_at": fu.updated_at
    }

@app.put("/api/followups/{fu_id}", response_model=schemas.FollowUpResponse)
async def update_followup(fu_id: int, fu_in: schemas.FollowUpUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from models import FollowUp
    
    fu = db.query(FollowUp).filter(FollowUp.id == fu_id).first()
    if not fu:
        raise HTTPException(status_code=404, detail="Follow-up not found")
    
    update_data = fu_in.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(fu, key, value)
    
    db.commit()
    db.refresh(fu)
    
    return {
        "id": fu.id,
        "lead_id": fu.lead_id,
        "lead_title": fu.lead.title if fu.lead else None,
        "lead_company": fu.lead.company if fu.lead else None,
        "type": fu.type,
        "note": fu.note,
        "status": fu.status,
        "next_follow_date": fu.next_follow_date,
        "created_at": fu.created_at,
        "updated_at": fu.updated_at
    }

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

@app.get("/api/projects", response_model=List[schemas.ProjectResponse])
async def get_projects(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from models import Project, Invoice
    from sqlalchemy.orm import joinedload
    
    # Eager load relationships to avoid N+1 queries
    projects = db.query(Project).options(
        joinedload(Project.lead), 
        joinedload(Project.invoices)
    ).order_by(Project.created_at.desc()).all()
    
    results = []
    for p in projects:
        # Aggregations
        total_invoiced = sum(i.total for i in p.invoices)
        total_paid = sum(i.total for i in p.invoices if i.status == "paid")
        
        results.append({
            "id": p.id,
            "lead_id": p.lead_id,
            "lead_title": p.lead.title if p.lead else "Unknown",
            "lead_company": p.lead.company if p.lead else "",
            "name": p.name,
            "description": p.description,
            "status": p.status,
            "budget": p.budget,
            "deadline": p.deadline,
            "progress": p.progress,
            "invoice_count": len(p.invoices),
            "total_invoiced": total_invoiced,
            "total_paid": total_paid,
            "created_at": p.created_at,
            "updated_at": p.updated_at
        })
    return results

@app.post("/api/projects", response_model=schemas.ProjectResponse)
async def create_project(project_in: schemas.ProjectCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from models import Project, Lead
    
    lead = db.query(Lead).filter(Lead.id == project_in.lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Update lead status to won
    lead.status = "won"
    
    project = Project(
        lead_id=project_in.lead_id,
        name=project_in.name,
        description=project_in.description,
        status=project_in.status,
        budget=project_in.budget,
        deadline=project_in.deadline,
        progress=project_in.progress,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    
    return {
        "id": project.id,
        "lead_id": project.lead_id,
        "lead_title": lead.title,
        "lead_company": lead.company,
        "name": project.name,
        "description": project.description,
        "status": project.status,
        "budget": project.budget,
        "deadline": project.deadline,
        "progress": project.progress,
        "invoice_count": 0,
        "total_invoiced": 0,
        "total_paid": 0,
        "created_at": project.created_at,
        "updated_at": project.updated_at
    }

@app.put("/api/projects/{project_id}", response_model=schemas.ProjectResponse)
async def update_project(project_id: int, project_in: schemas.ProjectUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from models import Project
    
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    update_data = project_in.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(project, key, value)
    
    db.commit()
    db.refresh(project)
    
    # For response, we need to re-calculate stats or return basic info
    # Re-fetching is safer for relations
    return {
        "id": project.id,
        "lead_id": project.lead_id,
        "lead_title": project.lead.title if project.lead else None,
        "lead_company": project.lead.company if project.lead else None,
        "name": project.name,
        "description": project.description,
        "status": project.status,
        "budget": project.budget,
        "deadline": project.deadline,
        "progress": project.progress,
        "invoice_count": len(project.invoices),
        "total_invoiced": sum(i.total for i in project.invoices),
        "total_paid": sum(i.total for i in project.invoices if i.status == "paid"),
        "created_at": project.created_at,
        "updated_at": project.updated_at
    }

@app.delete("/api/projects/{project_id}")
async def delete_project(project_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from models import Project, Invoice
    
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Cascade delete invoices matches DB configuration usually, but explicit here
    db.query(Invoice).filter(Invoice.project_id == project_id).delete()
    
    db.delete(project)
    db.commit()
    return {"status": "deleted"}

# ═══════════════════════════════════════════════════
# ──── INVOICE API ────
# ═══════════════════════════════════════════════════

@app.get("/api/invoices", response_model=List[schemas.InvoiceResponse])
async def get_invoices(project_id: int = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from models import Invoice, Project, Lead
    from sqlalchemy.orm import joinedload
    import json
    
    query = db.query(Invoice).options(
        joinedload(Invoice.project).joinedload(Project.lead)
    ).order_by(Invoice.created_at.desc())
    
    if project_id:
        query = query.filter(Invoice.project_id == project_id)
    invoices = query.all()
    
    results = []
    for inv in invoices:
        # Pydantic doesn't automatically parse JSON string fields to List[dict], we need to handle it
        # However, our schema expects List[InvoiceItem] for 'items'.
        parsed_items = json.loads(inv.items) if inv.items else []
        
        results.append({
            "id": inv.id,
            "project_id": inv.project_id,
            "project_name": inv.project.name if inv.project else "Unknown",
            "client_name": inv.project.lead.company if inv.project and inv.project.lead else "Unknown",
            "invoice_number": inv.invoice_number,
            "items": parsed_items,
            "subtotal": inv.subtotal,
            "tax_percent": inv.tax_percent,
            "total": inv.total,
            "status": inv.status,
            "due_date": inv.due_date,
            "paid_at": inv.paid_at,
            "notes": inv.notes,
            "created_at": inv.created_at,
            "updated_at": inv.updated_at
        })
    return results

@app.post("/api/invoices", response_model=schemas.InvoiceResponse)
async def create_invoice(invoice_in: schemas.InvoiceCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from models import Invoice, Project
    from datetime import date
    import json
    
    project = db.query(Project).filter(Project.id == invoice_in.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Auto-generate invoice number: INV-YYYYMM-NNN
    from datetime import datetime
    now = datetime.utcnow()
    count = db.query(Invoice).count() + 1
    inv_number = invoice_in.invoice_number or f"INV-{now.strftime('%Y%m')}-{count:03d}"
    
    # Serialize items
    items_data = [item.dict() for item in invoice_in.items]
    items_json = json.dumps(items_data)
    
    # Calculate totals
    subtotal = sum(item.qty * item.price for item in invoice_in.items)
    tax_pct = invoice_in.tax_percent
    total = subtotal + (subtotal * tax_pct / 100)
    
    invoice = Invoice(
        project_id=invoice_in.project_id,
        invoice_number=inv_number,
        items=items_json,
        subtotal=subtotal,
        tax_percent=tax_pct,
        total=total,
        status="draft",
        due_date=invoice_in.due_date,
        notes=invoice_in.notes,
    )
    db.add(invoice)
    db.commit()
    db.refresh(invoice)
    
    return {
        "id": invoice.id,
        "project_id": invoice.project_id,
        "project_name": project.name,
        "client_name": project.lead.company if project.lead else "Unknown",
        "invoice_number": invoice.invoice_number,
        "items": items_data,
        "subtotal": invoice.subtotal,
        "tax_percent": invoice.tax_percent,
        "total": invoice.total,
        "status": invoice.status,
        "due_date": invoice.due_date,
        "paid_at": invoice.paid_at,
        "notes": invoice.notes,
        "created_at": invoice.created_at,
        "updated_at": invoice.updated_at
    }

@app.put("/api/invoices/{inv_id}", response_model=schemas.InvoiceResponse)
async def update_invoice(inv_id: int, invoice_in: schemas.InvoiceUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from models import Invoice
    from datetime import date, datetime
    import json
    
    inv = db.query(Invoice).filter(Invoice.id == inv_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    update_data = invoice_in.dict(exclude_unset=True)
    
    # Handled specifically for calculation logic
    if "status" in update_data:
        inv.status = update_data["status"]
        if update_data["status"] == "paid":
            from models import get_wib_now
            inv.paid_at = get_wib_now()
            # Telegram notification for paid invoice
            from telegram_notifier import notify_invoice_paid, is_configured as tg_configured
            if tg_configured():
                await notify_invoice_paid(inv.invoice_number, inv.total)
                
    if "items" in update_data:
        items_list = update_data["items"] # List[InvoiceItem]
        items_dicts = [item.dict() for item in items_list] if items_list else [] # convert to dicts
        inv.items = json.dumps(items_dicts)
        
        # Recalculate subtotal
        # items_list is list of Pydantic models (InvoiceItem)
        if items_list:
            inv.subtotal = sum(item.qty * item.price for item in items_list)
        else:
            inv.subtotal = 0
            
        inv.total = inv.subtotal + (inv.subtotal * inv.tax_percent / 100)
        
    if "tax_percent" in update_data:
        inv.tax_percent = update_data["tax_percent"]
        inv.total = inv.subtotal + (inv.subtotal * inv.tax_percent / 100)
        
    if "due_date" in update_data:
        inv.due_date = update_data["due_date"]
        
    if "notes" in update_data:
        inv.notes = update_data["notes"]
    
    db.commit()
    db.refresh(inv)
    
    # Parse items back for response
    parsed_items = json.loads(inv.items) if inv.items else []
    
    return {
        "id": inv.id,
        "project_id": inv.project_id,
        "project_name": inv.project.name if inv.project else None,
        "client_name": inv.project.lead.company if inv.project and inv.project.lead else None,
        "invoice_number": inv.invoice_number,
        "items": parsed_items,
        "subtotal": inv.subtotal,
        "tax_percent": inv.tax_percent,
        "total": inv.total,
        "status": inv.status,
        "due_date": inv.due_date,
        "paid_at": inv.paid_at,
        "notes": inv.notes,
        "created_at": inv.created_at,
        "updated_at": inv.updated_at
    }

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
