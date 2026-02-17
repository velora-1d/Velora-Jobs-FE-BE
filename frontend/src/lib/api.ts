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
    created_at?: string;
}

export interface FollowUp {
    id: number;
    lead_id: number;
    lead_title: string;
    lead_company: string;
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
    // ─── Leads ───
    async getLeads(startDate?: string, endDate?: string): Promise<Lead[]> {
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
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

    // ─── WhatsApp ───
    async sendWA(target: string, message: string, leadId?: number): Promise<{ success: boolean; error?: string; detail?: string }> {
        try {
            return await authFetch(`${API_URL}/api/wa/send`, {
                method: 'POST',
                body: JSON.stringify({ target, message, lead_id: leadId }),
            });
        } catch {
            return { success: false, error: 'Network error' };
        }
    },

    // ─── Follow-ups ───
    async getFollowUps(leadId?: number): Promise<FollowUp[]> {
        const q = leadId ? `?lead_id=${leadId}` : '';
        return authFetch(`${API_URL}/api/followups${q}`);
    },

    async createFollowUp(data: { lead_id: number; type?: string; note?: string; next_follow_date?: string }) {
        return authFetch(`${API_URL}/api/followups`, { method: 'POST', body: JSON.stringify(data) });
    },

    async updateFollowUp(id: number, data: Partial<{ type: string; note: string; status: string; next_follow_date: string }>) {
        return authFetch(`${API_URL}/api/followups/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    },

    async deleteFollowUp(id: number) {
        return authFetch(`${API_URL}/api/followups/${id}`, { method: 'DELETE' });
    },

    // ─── Projects ───
    async getProjects(): Promise<Project[]> {
        return authFetch(`${API_URL}/api/projects`);
    },

    async createProject(data: { lead_id: number; name: string; description?: string; budget?: number; deadline?: string }) {
        return authFetch(`${API_URL}/api/projects`, { method: 'POST', body: JSON.stringify(data) });
    },

    async updateProject(id: number, data: Partial<{ name: string; description: string; status: string; budget: number; progress: number; deadline: string }>) {
        return authFetch(`${API_URL}/api/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    },

    async deleteProject(id: number) {
        return authFetch(`${API_URL}/api/projects/${id}`, { method: 'DELETE' });
    },

    // ─── Invoices ───
    async getInvoices(projectId?: number): Promise<Invoice[]> {
        const q = projectId ? `?project_id=${projectId}` : '';
        return authFetch(`${API_URL}/api/invoices${q}`);
    },

    async createInvoice(data: { project_id: number; items: InvoiceItem[]; tax_percent?: number; due_date?: string; notes?: string }) {
        return authFetch(`${API_URL}/api/invoices`, { method: 'POST', body: JSON.stringify(data) });
    },

    async updateInvoice(id: number, data: Partial<{ status: string; items: InvoiceItem[]; tax_percent: number; due_date: string; notes: string }>) {
        return authFetch(`${API_URL}/api/invoices/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    },

    async deleteInvoice(id: number) {
        return authFetch(`${API_URL}/api/invoices/${id}`, { method: 'DELETE' });
    },

    // ─── Stats ───
    async getStats(): Promise<Stats> {
        return authFetch(`${API_URL}/api/stats`);
    },

    // ─── Auth ───
    async login(email: string, password: string) {
        const formData = new FormData();
        formData.append('username', email);
        formData.append('password', password);

        const res = await fetch(`${API_URL}/api/login`, {
            method: 'POST',
            body: formData,
        });

        if (!res.ok) throw new Error('Login failed');

        const data = await res.json();
        localStorage.setItem('token', data.access_token);
        return data;
    },

    // ─── Telegram ───
    async testTelegram(): Promise<{ success: boolean; error?: string }> {
        return authFetch(`${API_URL}/api/telegram/test`, { method: 'POST' });
    },

    // ─── Campaigns ───
    async getCampaigns(): Promise<Campaign[]> {
        return authFetch(`${API_URL}/api/campaigns`);
    },

    async createCampaign(data: { name: string; message_template?: string; target_criteria?: string; scheduled_at?: string }) {
        return authFetch(`${API_URL}/api/campaigns`, { method: 'POST', body: JSON.stringify(data) });
    },

    async updateCampaign(id: number, data: Partial<Campaign>) {
        return authFetch(`${API_URL}/api/campaigns/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    },

    async deleteCampaign(id: number) {
        return authFetch(`${API_URL}/api/campaigns/${id}`, { method: 'DELETE' });
    },

    // ─── Campaign Runner ───
    async launchCampaign(id: number) {
        return authFetch(`${API_URL}/api/campaigns/${id}/launch`, { method: 'POST' });
    },

    async getCampaignStatus() {
        return authFetch(`${API_URL}/api/campaigns/status`);
    },

    async stopCampaign() {
        return authFetch(`${API_URL}/api/campaigns/stop`, { method: 'POST' });
    },

    // ─── Promotion Templates ───
    async getTemplates(): Promise<PromotionTemplate[]> {
        return authFetch(`${API_URL}/api/templates`);
    },

    async createTemplate(data: { title: string; category: string; content: string; variables?: string }) {
        return authFetch(`${API_URL}/api/templates`, { method: 'POST', body: JSON.stringify(data) });
    },

    async updateTemplate(id: number, data: Partial<PromotionTemplate>) {
        return authFetch(`${API_URL}/api/templates/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    },

    async deleteTemplate(id: number) {
        return authFetch(`${API_URL}/api/templates/${id}`, { method: 'DELETE' });
    },

    async seedTemplates() {
        return authFetch(`${API_URL}/api/templates/seed`, { method: 'POST' });
    },

    // ─── Prospects ───
    async getProspects(startDate?: string, endDate?: string, category?: string, status?: string): Promise<Prospect[]> {
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        if (category) params.append('category', category);
        if (status) params.append('status', status);
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
