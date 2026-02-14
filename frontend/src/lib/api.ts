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
    won: number;
    active_projects: number;
    total_projects: number;
    pending_followups: number;
    total_revenue: number;
    unpaid_invoices: number;
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

export const api = {
    // ─── Leads ───
    async getLeads(startDate?: string, endDate?: string): Promise<Lead[]> {
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        const queryString = params.toString() ? `?${params.toString()}` : '';
        return authFetch(`${API_URL}/api/leads${queryString}`);
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
};
