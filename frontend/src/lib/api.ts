const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface Lead {
    id: number;
    title: string;
    company: string;
    location: string;
    description?: string;
    url: string;
    source: string;
    match_score?: number;
    match_reason?: string;
    phone?: string;
    has_website?: boolean;
    status: string;
    email?: string;
    rating?: number;
    wa_contacted_at?: string;
    created_at?: string;
}

export interface FollowUp {
    id: number;
    lead_id?: number;
    prospect_id?: number;
    lead_title?: string;
    lead_company?: string;
    prospect_name?: string;
    prospect_category?: string;
    type: string;
    note: string;
    status: string;
    next_follow_date: string | null;
    created_at: string | null;
}

export interface Project {
    id: number;
    lead_id: number;
    lead_title: string;
    lead_company: string;
    name: string;
    description: string;
    status: string;
    budget: number | null;
    deadline: string | null;
    progress: number;
    invoice_count: number;
    total_invoiced: number;
    total_paid: number;
    created_at: string | null;
}

export interface InvoiceItem {
    desc: string;
    qty: number;
    price: number;
}

export interface Invoice {
    id: number;
    project_id: number;
    project_name: string;
    client_name: string;
    invoice_number: string;
    items: InvoiceItem[];
    subtotal: number;
    tax_percent: number;
    total: number;
    status: string;
    due_date: string | null;
    paid_at: string | null;
    notes: string;
    created_at: string | null;
}

export interface Stats {
    total_leads: number;
    new_leads: number;
    contacted: number;
    interested: number;
    won: number;
    total_prospects: number;
    prospects_contacted: number;
    prospects_won: number;
    active_projects: number;
    total_projects: number;
    pending_followups: number;
    total_revenue: number;
    unpaid_invoices: number;
    total_campaigns: number;
    active_campaigns: number;
    total_sent: number;
    total_failed: number;
    weekly: { date: string; leads: number; prospects: number }[];
}

export interface ActivityLog {
    id: number;
    category: string;
    level: string;
    message: string;
    details?: string;
    created_at: string;
}

export interface AIBriefing {
    briefing: string;
    stats: Record<string, number>;
}

export interface AIEnrichment {
    lead_id: number;
    enrichment: {
        emails: string[];
        keywords: string[];
        pain_points: string;
    };
}

export interface AITemplate {
    template: string;
    category: string;
    service: string;
}

export interface Campaign {
    id: number;
    name: string;
    status: string;
    message_template?: string;
    target_criteria?: string;
    target_type?: string;
    template_id?: number;
    sent_count?: number;
    failed_count?: number;
    scheduled_at?: string;
    smart_ai?: boolean;
    created_at?: string;
}

export interface PromotionTemplate {
    id: number;
    title: string;
    category: string;
    content: string;
    variables?: string;
    created_at?: string;
    updated_at?: string;
}

export interface Prospect {
    id: number;
    name: string;
    category: string;
    address?: string;
    phone: string;
    email?: string;
    website?: string;
    has_website: boolean;
    rating?: number;
    review_count?: number;
    maps_url?: string;
    match_score?: number;
    match_reason?: string;
    status: string;
    source_keyword?: string;
    wa_contacted_at?: string;
    created_at?: string;
    updated_at?: string;
}

export interface ProspectStats {
    total: number;
    contacted: number;
    won: number;
    without_website: number;
}

function authHeaders(): HeadersInit {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

async function authFetch(url: string, opts: RequestInit = {}) {
    const res = await fetch(url, { ...opts, headers: { ...authHeaders(), ...(opts.headers || {}) } });
    if (res.status === 401) { window.location.href = '/login'; throw new Error('Unauthorized'); }
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    return res.json();
}

export const fetcher = (url: string) => authFetch(url);

export const api = {
    API_URL,

    async login(email: string, pass: string): Promise<{ access_token: string; token_type: string }> {
        const formData = new FormData();
        formData.append('username', email);
        formData.append('password', pass);
        const res = await fetch(`${API_URL}/api/login`, {
            method: 'POST',
            body: formData,
        });
        if (!res.ok) throw new Error('Invalid credentials');
        const data = await res.json();
        localStorage.setItem('token', data.access_token);
        return data;
    },
    // ─── Leads ───
    async getLeads(filters: { start_date?: string; end_date?: string; source?: string; status?: string; min_score?: number; max_score?: number; wa_status?: string; search?: string } = {}): Promise<Lead[]> {
        const params = new URLSearchParams();
        if (filters.start_date) params.append('start_date', filters.start_date);
        if (filters.end_date) params.append('end_date', filters.end_date);
        if (filters.source && filters.source !== 'all') params.append('source', filters.source);
        if (filters.status && filters.status !== 'all') params.append('status', filters.status);
        if (filters.min_score !== undefined) params.append('min_score', filters.min_score.toString());
        if (filters.max_score !== undefined) params.append('max_score', filters.max_score.toString());
        if (filters.wa_status && filters.wa_status !== 'all') params.append('wa_status', filters.wa_status);
        if (filters.search) params.append('search', filters.search);

        const queryString = params.toString() ? `?${params.toString()}` : '';
        return authFetch(`${API_URL}/api/leads${queryString}`);
    },

    async createLead(data: Partial<Lead>) {
        return authFetch(`${API_URL}/api/leads`, { method: 'POST', body: JSON.stringify(data) });
    },

    async updateLead(id: number, data: Partial<Lead>) {
        return authFetch(`${API_URL}/api/leads/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    },

    async deleteLead(id: number) {
        return authFetch(`${API_URL}/api/leads/${id}`, { method: 'DELETE' });
    },

    async startScrape(keywords: string, location: string = 'Indonesia', sources: string[] = ['linkedin', 'upwork', 'indeed', 'glints', 'gmaps'], limit: number = 10, safeMode: boolean = false) {
        const srcParam = sources.join(',');
        return authFetch(`${API_URL}/api/scrape?keywords=${encodeURIComponent(keywords)}&location=${encodeURIComponent(location)}&sources=${srcParam}&limit=${limit}&safe_mode=${safeMode}`);
    },

    async getScrapeStatus() {
        return authFetch(`${API_URL}/api/scrape/status`);
    },

    async stopScrape() {
        return authFetch(`${API_URL}/api/scrape/stop`, {
            method: 'POST'
        });
    },

    // ─── Settings ───
    async getSettings() {
        return authFetch(`${API_URL}/api/settings`);
    },

    async saveSettings(config: Record<string, string>) {
        return authFetch(`${API_URL}/api/settings`, { method: 'POST', body: JSON.stringify(config) });
    },

    async testTelegram(): Promise<{ success: boolean; error?: string }> {
        return authFetch(`${API_URL}/api/settings/test-telegram`, { method: 'POST' });
    },

    // ─── WhatsApp ───
    async sendWA(target: string, message: string, leadId?: number, prospectId?: number): Promise<{ success: boolean; error?: string; detail?: string }> {
        return authFetch(`${API_URL}/api/wa/send`, {
            method: 'POST',
            body: JSON.stringify({ target, message, lead_id: leadId, prospect_id: prospectId }),
        });
    },

    // ─── Follow-ups ───
    async getFollowUps(leadId?: number, filters: { start_date?: string; end_date?: string } = {}): Promise<FollowUp[]> {
        const params = new URLSearchParams();
        if (leadId) params.append('lead_id', leadId.toString());
        if (filters.start_date) params.append('start_date', filters.start_date);
        if (filters.end_date) params.append('end_date', filters.end_date);
        return authFetch(`${API_URL}/api/followups?${params.toString()}`);
    },

    async createFollowUp(data: { lead_id?: number; prospect_id?: number; type?: string; note?: string; next_follow_date?: string }) {
        return authFetch(`${API_URL}/api/followups`, { method: 'POST', body: JSON.stringify(data) });
    },

    async updateFollowUp(id: number, data: Partial<FollowUp>) {
        return authFetch(`${API_URL}/api/followups/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    },

    async deleteFollowUp(id: number) {
        return authFetch(`${API_URL}/api/followups/${id}`, { method: 'DELETE' });
    },

    // ─── Projects ───
    async getProjects(): Promise<Project[]> {
        return authFetch(`${API_URL}/api/projects`);
    },

    async createProject(data: Partial<Project>) {
        return authFetch(`${API_URL}/api/projects`, { method: 'POST', body: JSON.stringify(data) });
    },

    async updateProject(id: number, data: Partial<Project>) {
        return authFetch(`${API_URL}/api/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    },

    async deleteProject(id: number) {
        return authFetch(`${API_URL}/api/projects/${id}`, { method: 'DELETE' });
    },

    // ─── Invoices ───
    async getInvoices(): Promise<Invoice[]> {
        return authFetch(`${API_URL}/api/invoices`);
    },

    async createInvoice(data: Partial<Invoice>) {
        return authFetch(`${API_URL}/api/invoices`, { method: 'POST', body: JSON.stringify(data) });
    },

    async updateInvoice(id: number, data: Partial<Invoice>) {
        return authFetch(`${API_URL}/api/invoices/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    },

    async deleteInvoice(id: number) {
        return authFetch(`${API_URL}/api/invoices/${id}`, { method: 'DELETE' });
    },

    // ─── Prospects ───
    async getProspects(filters: { start_date?: string; end_date?: string; category?: string; status?: string; min_score?: number; max_score?: number; wa_status?: string; search?: string } = {}): Promise<Prospect[]> {
        const params = new URLSearchParams();
        if (filters.start_date) params.append('start_date', filters.start_date);
        if (filters.end_date) params.append('end_date', filters.end_date);
        if (filters.category && filters.category !== 'all') params.append('category', filters.category);
        if (filters.status && filters.status !== 'all') params.append('status', filters.status);
        if (filters.min_score !== undefined) params.append('min_score', filters.min_score.toString());
        if (filters.max_score !== undefined) params.append('max_score', filters.max_score.toString());
        if (filters.wa_status && filters.wa_status !== 'all') params.append('wa_status', filters.wa_status);
        if (filters.search) params.append('search', filters.search);

        const qs = params.toString() ? `?${params.toString()}` : '';
        return authFetch(`${API_URL}/api/prospects${qs}`);
    },

    async getProspectStats(): Promise<ProspectStats> {
        return authFetch(`${API_URL}/api/prospects/stats`);
    },

    async createProspect(data: Partial<Prospect>) {
        return authFetch(`${API_URL}/api/prospects`, { method: 'POST', body: JSON.stringify(data) });
    },

    async updateProspect(id: number, data: Partial<Prospect>) {
        return authFetch(`${API_URL}/api/prospects/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    },

    async deleteProspect(id: number) {
        return authFetch(`${API_URL}/api/prospects/${id}`, { method: 'DELETE' });
    },

    // ─── AI Specialist Quartet ───
    async getActivityLogs(limit: number = 50, category?: string): Promise<ActivityLog[]> {
        const params = new URLSearchParams();
        params.append('limit', String(limit));
        if (category) params.append('category', category);
        return authFetch(`${API_URL}/api/logs?${params.toString()}`);
    },

    async getAIBriefing(): Promise<AIBriefing> {
        return authFetch(`${API_URL}/api/stats/ai-briefing`);
    },

    async enrichLead(leadId: number): Promise<AIEnrichment> {
        return authFetch(`${API_URL}/api/leads/${leadId}/enrich`, { method: 'POST' });
    },

    async generateTemplate(targetCategory: string, serviceType: string, tone: string = 'professional'): Promise<AITemplate> {
        const params = new URLSearchParams({ target_category: targetCategory, service_type: serviceType, tone });
        return authFetch(`${API_URL}/api/campaigns/generate-template?${params.toString()}`, { method: 'POST' });
    },

    async getCampaignStatus(): Promise<any> {
        return authFetch(`${API_URL}/api/campaigns/status`);
    },

    // ─── Campaigns ───
    async createCampaign(data: any) {
        return authFetch(`${API_URL}/api/campaigns`, { method: 'POST', body: JSON.stringify(data) });
    },
    async updateCampaign(id: number, data: any) {
        return authFetch(`${API_URL}/api/campaigns/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    },
    async deleteCampaign(id: number) {
        return authFetch(`${API_URL}/api/campaigns/${id}`, { method: 'DELETE' });
    },
    async launchCampaign(id: number) {
        return authFetch(`${API_URL}/api/campaigns/${id}/launch`, { method: 'POST' });
    },
    async stopCampaign() {
        return authFetch(`${API_URL}/api/campaigns/stop`, { method: 'POST' });
    },

    // ─── Templates ───
    async createTemplate(data: any) {
        return authFetch(`${API_URL}/api/templates`, { method: 'POST', body: JSON.stringify(data) });
    },
    async updateTemplate(id: number, data: any) {
        return authFetch(`${API_URL}/api/templates/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    },
    async deleteTemplate(id: number) {
        return authFetch(`${API_URL}/api/templates/${id}`, { method: 'DELETE' });
    },
    async seedTemplates() {
        return authFetch(`${API_URL}/api/templates/seed`, { method: 'POST' });
    },

    async personalizeMessage(recipientData: any): Promise<{ message: string }> {
        return authFetch(`${API_URL}/api/ai/personalize`, {
            method: 'POST',
            body: JSON.stringify(recipientData)
        });
    },

    // ─── Export (CSV) ───
    async exportCSV(type: 'leads' | 'projects' | 'invoices') {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/api/export/${type}`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Export failed');
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}_export.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    },

    async generateAiProposal(payload: any): Promise<{
        client_type: string;
        greeting: string;
        summary: string;
        problem_analysis: string;
        offerings: { title: string; description: string; deliverables: string[] }[];
        timeline: string;
        pricing_strategy: string;
        why_us: string;
        next_steps: string;
    }> {
        return authFetch(`${API_URL}/api/ai/proposal`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    },
};
