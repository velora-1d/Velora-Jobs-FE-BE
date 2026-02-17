from pydantic import BaseModel, EmailStr, HttpUrl
from typing import List, Optional
from datetime import datetime, date

# ---------------------------------------------------------------------
# SHARED MODELS
# ---------------------------------------------------------------------

class TimestampMixin(BaseModel):
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# ---------------------------------------------------------------------
# LEAD MODELS
# ---------------------------------------------------------------------

class LeadBase(BaseModel):
    title: str = "New Lead"
    company: str = "Unknown"
    location: Optional[str] = None
    email: Optional[EmailStr] = None
    description: Optional[str] = None
    url: Optional[str] = None
    source: str = "Manual"
    status: str = "new"  # new, contacted, negotiation, won, lost
    phone: Optional[str] = None
    has_website: Optional[bool] = None
    match_score: Optional[float] = None
    match_reason: Optional[str] = None
    rating: Optional[int] = None # Keeping for compatibility if used

class LeadCreate(LeadBase):
    pass

class LeadUpdate(BaseModel):
    title: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    email: Optional[EmailStr] = None
    description: Optional[str] = None
    url: Optional[str] = None
    source: Optional[str] = None
    status: Optional[str] = None
    phone: Optional[str] = None
    has_website: Optional[bool] = None
    match_score: Optional[float] = None
    match_reason: Optional[str] = None
    rating: Optional[int] = None

class LeadResponse(LeadBase, TimestampMixin):
    id: int
    wa_contacted_at: Optional[datetime] = None

# ---------------------------------------------------------------------
# FOLLOW-UP MODELS
# ---------------------------------------------------------------------

class FollowUpBase(BaseModel):
    type: str = "wa"  # wa, call, email, meeting
    note: Optional[str] = None
    status: str = "pending"  # pending, done, skipped
    next_follow_date: Optional[date] = None

class FollowUpCreate(FollowUpBase):
    lead_id: Optional[int] = None
    prospect_id: Optional[int] = None

class FollowUpUpdate(BaseModel):
    type: Optional[str] = None
    note: Optional[str] = None
    status: Optional[str] = None
    next_follow_date: Optional[date] = None

class FollowUpResponse(FollowUpBase, TimestampMixin):
    id: int
    lead_id: Optional[int] = None
    prospect_id: Optional[int] = None
    lead_title: Optional[str] = None
    lead_company: Optional[str] = None
    prospect_name: Optional[str] = None
    prospect_category: Optional[str] = None

# ---------------------------------------------------------------------
# PROJECT MODELS
# ---------------------------------------------------------------------

class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    status: str = "negotiation"  # negotiation, active, completed, cancelled
    budget: Optional[float] = None
    deadline: Optional[date] = None
    progress: int = 0

class ProjectCreate(ProjectBase):
    lead_id: int

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    budget: Optional[float] = None
    deadline: Optional[date] = None
    progress: Optional[int] = None

class ProjectResponse(ProjectBase, TimestampMixin):
    id: int
    lead_id: int
    lead_title: Optional[str] = None
    lead_company: Optional[str] = None
    invoice_count: int = 0
    total_invoiced: float = 0
    total_paid: float = 0

# ---------------------------------------------------------------------
# INVOICE MODELS
# ---------------------------------------------------------------------

class InvoiceItem(BaseModel):
    desc: str
    qty: int = 1
    price: float = 0

    class Config:
        from_attributes = True

class InvoiceBase(BaseModel):
    items: List[InvoiceItem] = []
    tax_percent: float = 0
    status: str = "draft"  # draft, sent, paid, overdue
    due_date: Optional[date] = None
    notes: Optional[str] = None
    invoice_number: Optional[str] = None # Optional on create, auto-generated

class InvoiceCreate(InvoiceBase):
    project_id: int

class InvoiceUpdate(BaseModel):
    status: Optional[str] = None
    items: Optional[List[InvoiceItem]] = None
    tax_percent: Optional[float] = None
    due_date: Optional[date] = None
    notes: Optional[str] = None

class InvoiceResponse(InvoiceBase, TimestampMixin):
    id: int
    project_id: int
    project_name: Optional[str] = None
    client_name: Optional[str] = None
    subtotal: float
    total: float
    paid_at: Optional[datetime] = None

# ---------------------------------------------------------------------
# CAMPAIGN MODELS
# ---------------------------------------------------------------------

class CampaignBase(BaseModel):
    name: str
    status: str = "draft"
    message_template: Optional[str] = None
    target_criteria: Optional[str] = None # JSON string
    target_type: str = "leads"  # "leads" or "prospects"
    template_id: Optional[int] = None
    scheduled_at: Optional[datetime] = None

class CampaignCreate(CampaignBase):
    pass

class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    message_template: Optional[str] = None
    target_criteria: Optional[str] = None
    target_type: Optional[str] = None
    template_id: Optional[int] = None
    scheduled_at: Optional[datetime] = None

class CampaignResponse(CampaignBase, TimestampMixin):
    id: int
    sent_count: int = 0
    failed_count: int = 0

# ---------------------------------------------------------------------
# PROMOTION TEMPLATE MODELS
# ---------------------------------------------------------------------

class TemplateBase(BaseModel):
    title: str
    category: str = "general"  # pesantren, sekolah, umkm, general
    content: str
    variables: Optional[str] = None  # JSON list

class TemplateCreate(TemplateBase):
    pass

class TemplateUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    content: Optional[str] = None
    variables: Optional[str] = None

class TemplateResponse(TemplateBase, TimestampMixin):
    id: int

# ---------------------------------------------------------------------
# PROSPECT MODELS (Google Maps)
# ---------------------------------------------------------------------

class ProspectBase(BaseModel):
    name: str = "New Prospect"
    category: str = "Local Business"
    address: Optional[str] = None
    phone: str  # REQUIRED
    email: Optional[str] = None
    website: Optional[str] = None
    has_website: bool = False
    rating: Optional[float] = None
    review_count: Optional[int] = None
    maps_url: Optional[str] = None
    match_score: Optional[float] = None
    match_reason: Optional[str] = None
    status: str = "new"
    source_keyword: Optional[str] = None

class ProspectCreate(ProspectBase):
    pass

class ProspectUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    website: Optional[str] = None
    has_website: Optional[bool] = None
    rating: Optional[float] = None
    review_count: Optional[int] = None
    match_score: Optional[float] = None
    match_reason: Optional[str] = None
    status: Optional[str] = None

class Prospect(ProspectBase, TimestampMixin):
    id: int
    maps_url: str
    wa_contacted_at: Optional[datetime] = None

# ---------------------------------------------------------------------
# ACTIVITY LOG MODELS
# ---------------------------------------------------------------------

class ActivityLogBase(BaseModel):
    category: str  # scraper, ai_scoring, campaign, system, enrichment
    level: str = "info"  # info, warning, error
    message: str
    details: Optional[str] = None  # JSON string

class ActivityLogCreate(ActivityLogBase):
    pass

class ActivityLog(ActivityLogBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
# ---------------------------------------------------------------------
# SETTINGS & MISC
# ---------------------------------------------------------------------

class SettingsUpdate(BaseModel):
    openai_api_key: Optional[str] = None
    openai_model: Optional[str] = None
    fonnte_token: Optional[str] = None
    proxy_url: Optional[str] = None
    linkedin_cookie: Optional[str] = None

class WhatsAppSend(BaseModel):
    target: str
    message: str
    lead_id: Optional[int] = None
    prospect_id: Optional[int] = None
