from sqlalchemy import Column, Integer, String, DateTime, Text, Float, Boolean, ForeignKey, Date
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

import pytz

Base = declarative_base()

def get_wib_now():
    """Returns current time in WIB (Asia/Jakarta)."""
    return datetime.now(pytz.timezone('Asia/Jakarta')).replace(tzinfo=None)

class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    company = Column(String)
    location = Column(String, nullable=True)
    email = Column(String, nullable=True, index=True)
    description = Column(Text, nullable=True)
    url = Column(String, unique=True, index=True)
    source = Column(String)  # e.g., "LinkedIn", "Upwork"
    match_score = Column(Float, nullable=True)
    match_reason = Column(Text, nullable=True)
    phone = Column(String, nullable=True)
    has_website = Column(Boolean, nullable=True)
    status = Column(String, default="new", index=True)  # new, contacted, negotiation, won, lost
    created_at = Column(DateTime, default=get_wib_now, index=True)
    updated_at = Column(DateTime, default=get_wib_now, onupdate=get_wib_now)

    # Relationships
    follow_ups = relationship("FollowUp", back_populates="lead", cascade="all, delete-orphan")
    projects = relationship("Project", back_populates="lead", cascade="all, delete-orphan")

class FollowUp(Base):
    __tablename__ = "follow_ups"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False, index=True)
    type = Column(String, default="wa")  # wa, call, email, meeting
    note = Column(Text, nullable=True)
    status = Column(String, default="pending", index=True)  # pending, done, skipped
    next_follow_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=get_wib_now, index=True)
    updated_at = Column(DateTime, default=get_wib_now, onupdate=get_wib_now)

    lead = relationship("Lead", back_populates="follow_ups")

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String, default="negotiation", index=True)  # negotiation, active, completed, cancelled
    budget = Column(Float, nullable=True)
    deadline = Column(Date, nullable=True)
    progress = Column(Integer, default=0)  # 0-100
    created_at = Column(DateTime, default=get_wib_now, index=True)
    updated_at = Column(DateTime, default=get_wib_now, onupdate=get_wib_now)

    lead = relationship("Lead", back_populates="projects")
    invoices = relationship("Invoice", back_populates="project", cascade="all, delete-orphan")

class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    invoice_number = Column(String, unique=True, nullable=False)
    items = Column(Text, nullable=True)  # JSON string: [{desc, qty, price}]
    subtotal = Column(Float, default=0)
    tax_percent = Column(Float, default=0)
    total = Column(Float, default=0)
    status = Column(String, default="draft", index=True)  # draft, sent, paid, overdue
    due_date = Column(Date, nullable=True)
    paid_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=get_wib_now, index=True)
    updated_at = Column(DateTime, default=get_wib_now, onupdate=get_wib_now)

    project = relationship("Project", back_populates="invoices")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)

class Setting(Base):
    __tablename__ = "settings"

    key = Column(String, primary_key=True, index=True)
    value = Column(String)
    description = Column(String, nullable=True)

class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    status = Column(String, default="draft", index=True)  # draft, scheduled, running, completed
    message_template = Column(Text, nullable=True)
    target_criteria = Column(Text, nullable=True)  # JSON string
    target_type = Column(String, default="leads")  # "leads" or "prospects"
    template_id = Column(Integer, nullable=True)   # FK to promotion_templates (optional)
    smart_ai = Column(Boolean, default=False)       # If True, generate unique message for each lead
    sent_count = Column(Integer, default=0)
    failed_count = Column(Integer, default=0)
    scheduled_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=get_wib_now, index=True)
    updated_at = Column(DateTime, default=get_wib_now, onupdate=get_wib_now)

class PromotionTemplate(Base):
    """Reusable message templates for WhatsApp campaigns."""
    __tablename__ = "promotion_templates"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)           # e.g. "Pesantren Outreach"
    category = Column(String, default="general")     # pesantren, sekolah, umkm, general
    content = Column(Text, nullable=False)           # Message with {name}, {company} placeholders
    variables = Column(Text, nullable=True)          # JSON list of available variables
    created_at = Column(DateTime, default=get_wib_now, index=True)
    updated_at = Column(DateTime, default=get_wib_now, onupdate=get_wib_now)

class Prospect(Base):
    """Google Maps business prospects — separate from job leads."""
    __tablename__ = "prospects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)               # Business name
    category = Column(String, index=True)            # e.g. "Pesantren", "Sekolah Dasar", "Toko Bangunan"
    address = Column(Text, nullable=True)            # Full address
    phone = Column(String, nullable=False)            # REQUIRED — WA/Telp number
    email = Column(String, nullable=True)             # Business email
    website = Column(String, nullable=True)           # Website URL
    has_website = Column(Boolean, default=False)      # Quick flag
    rating = Column(Float, nullable=True)             # Google Maps rating (1-5)
    review_count = Column(Integer, nullable=True)     # Number of reviews
    maps_url = Column(String, unique=True, index=True) # Google Maps link (dedup key)
    match_score = Column(Float, nullable=True)        # AI scorer result
    match_reason = Column(Text, nullable=True)        # AI scorer reason
    status = Column(String, default="new", index=True) # new, contacted, negotiation, won, lost
    source_keyword = Column(String, nullable=True)    # Keyword used during scraping
    created_at = Column(DateTime, default=get_wib_now, index=True)
    updated_at = Column(DateTime, default=get_wib_now, onupdate=get_wib_now)

class ActivityLog(Base):
    """Centralized audit log for all AI and automation activities."""
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(String, index=True)  # scraper, ai_scoring, campaign, system, enrichment
    level = Column(String, default="info", index=True)  # info, warning, error
    message = Column(Text, nullable=False)  # Human-readable description
    details = Column(Text, nullable=True)  # JSON string for extra details (AI reasoning, stats, etc.)
    created_at = Column(DateTime, default=get_wib_now, index=True)
