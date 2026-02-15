'use client';

import React, { useEffect, useState } from 'react';
import useSWR from 'swr';
import { api, fetcher, Lead } from '@/lib/api';
import {
    Loader2, ExternalLink, Database, Search, Download, Zap,
    MessageCircle, X, Copy, Check, Send, ChevronDown, Phone,
    Building2, School, ShoppingBag, Briefcase, CheckCircle2, XCircle,
    Plus, Edit, Trash2, MapPin, Globe, Mail
} from 'lucide-react';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import * as XLSX from 'xlsx';
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon';

// ─── Pre-built Message Templates (Unchanged) ────────────────────────
const DEFAULT_TEMPLATES = [
    {
        id: 'pesantren',
        label: 'Pesantren',
        Icon: Building2,
        message: `Assalamualaikum Wr. Wb.

Perkenalkan saya {{nama_saya}}, seorang web developer profesional. Saya menemukan {{nama_lead}} di Google Maps dan melihat bahwa saat ini belum memiliki website resmi.

Saya ingin menawarkan jasa pembuatan website untuk {{nama_lead}} yang mencakup:
✅ Profil pesantren & visi misi
✅ Pendaftaran santri online
✅ Galeri kegiatan
✅ Informasi kurikulum
✅ Kontak & lokasi

Dengan website, calon wali santri bisa lebih mudah menemukan informasi tentang pesantren Bapak/Ibu.

Apakah berkenan untuk saya jelaskan lebih lanjut? Jazakallahu khairan. 🙏`,
    },
    {
        id: 'sekolah',
        label: 'Sekolah',
        Icon: School,
        message: `Assalamualaikum/Selamat siang,

Perkenalkan saya {{nama_saya}}, fullstack developer. Saya melihat {{nama_lead}} belum memiliki website resmi.

Di era digital ini, website sekolah sangat penting untuk:
✅ Informasi PPDB online
✅ Profil sekolah & prestasi
✅ Portal siswa & orang tua
✅ Agenda & pengumuman
✅ Galeri kegiatan

Saya bisa membuatkan website profesional yang modern dan responsive. Apakah Bapak/Ibu berkenan untuk diskusi lebih lanjut?

Terima kasih. 🙏`,
    },
    {
        id: 'umkm',
        label: 'UMKM',
        Icon: ShoppingBag,
        message: `Halo Kak, selamat siang 👋

Perkenalkan saya {{nama_saya}}, web developer. Saya menemukan {{nama_lead}} di pencarian Google dan tertarik untuk menawarkan jasa pembuatan website.

Dengan website, bisnis Kakak bisa:
🚀 Ditemukan lebih mudah di Google
📱 Terlihat profesional & terpercaya
📦 Tampilkan katalog produk/jasa
💬 Customer bisa order/konsultasi online
📊 Track pengunjung & performa

Saya bisa buatkan website yang keren & affordable. Boleh saya jelaskan paketnya? 😊`,
    },
    {
        id: 'general',
        label: 'Umum',
        Icon: Briefcase,
        message: `Halo, selamat siang 👋

Perkenalkan saya {{nama_saya}}, seorang fullstack developer profesional.

Saya melihat {{nama_lead}} dan ingin menawarkan jasa pembuatan aplikasi/website yang bisa membantu digitalisasi bisnis Bapak/Ibu.

Layanan saya meliputi:
✅ Website company profile
✅ Aplikasi manajemen internal
✅ Sistem informasi custom
✅ E-commerce & katalog online

Apakah berkenan untuk berdiskusi? Terima kasih. 🙏`,
    },
];

// ─── Utility Components ────────────────────────
function MatchBadge({ score }: { score?: number }) {
    if (score === undefined || score === null) {
        return <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-muted/20 text-muted-foreground border border-border uppercase tracking-wider">N/A</span>;
    }
    let color = 'bg-red-500/10 text-red-500 border-red-500/20';
    let label = 'Low';
    if (score >= 75) { color = 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'; label = 'High'; }
    else if (score >= 50) { color = 'bg-amber-500/10 text-amber-500 border-amber-500/20'; label = 'Mid'; }
    return (
        <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${color}`}>{label}</span>
            <span className="text-[10px] text-muted-foreground font-mono">{score}%</span>
        </div>
    );
}

function SourceBadge({ source }: { source: string }) {
    const colors: Record<string, string> = {
        'LinkedIn': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
        'Upwork': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
        'Indeed': 'bg-purple-500/10 text-purple-500 border-purple-500/20',
        'Glints': 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
        'Google Maps': 'bg-red-500/10 text-red-500 border-red-500/20',
        'Manual': 'bg-muted/20 text-muted-foreground border-border',
    };
    return <span className={`px-2 py-1 rounded text-[10px] font-bold border uppercase tracking-wider ${colors[source] || 'bg-muted/20 text-muted-foreground border-border'}`}>{source}</span>;
}

function StatusBadge({ status }: { status: string }) {
    const map: Record<string, string> = {
        'new': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
        'contacted': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
        'interested': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
        'rejected': 'bg-red-500/10 text-red-500 border-red-500/20',
        'won': 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    };
    return <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-widest ${map[status] || map['new']}`}>{status}</span>;
}

// ─── WA Outreach Modal ────────────────────────
function WAModal({ lead, onClose, templates, myName }: any) {
    const [selectedTemplate, setSelectedTemplate] = useState('pesantren');
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [sendResult, setSendResult] = useState<{ success: boolean; error?: string } | null>(null);

    useEffect(() => {
        const tpl = templates.find((t: any) => t.id === selectedTemplate);
        if (tpl) {
            let filled = tpl.message;
            filled = filled.split('{{nama_lead}}').join(lead.title);
            filled = filled.split('{{nama_saya}}').join(myName || 'Mahin');
            filled = filled.split('{{lokasi}}').join(lead.location);
            filled = filled.split('{{company}}').join(lead.company);
            setMessage(filled);
        }
    }, [selectedTemplate, lead, myName]);

    const getPhoneNumber = () => {
        const ph = lead.phone || '';
        if (!ph && lead.description) {
            const match = lead.description.match(/(?:Telp|Phone|HP|WA)[:\s]*([\d\-+\s()]+)/i);
            return match ? match[1].replace(/[\s\-()]/g, '') : '';
        }
        return ph.replace(/[\s\-()]/g, '');
    };
    const phone = getPhoneNumber();
    const waPhone = phone.replace(/[^\d+]/g, '').replace(/^0/, '62').replace(/^\+/, '');

    const handleSendFonnte = async () => {
        if (!waPhone || !message) return;
        setSending(true);
        try {
            const result = await api.sendWA(waPhone, message, lead.id);
            setSendResult(result);
        } catch { setSendResult({ success: false, error: 'Network error' }); }
        finally { setSending(false); }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-card border border-border rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <h3 className="text-foreground font-bold text-lg flex items-center gap-2"><WhatsAppIcon className="w-5 h-5 text-[#25D366]" /> Outreach — {lead.title}</h3>
                    <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground hover:text-foreground" /></button>
                </div>
                <div className="p-6 border-b border-border">
                    <div className="flex flex-wrap gap-2">
                        {templates.map((tpl: any) => (
                            <button key={tpl.id} onClick={() => setSelectedTemplate(tpl.id)} className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${selectedTemplate === tpl.id ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-500' : 'bg-muted/20 border-border text-muted-foreground'}`}>{tpl.label}</button>
                        ))}
                    </div>
                </div>
                <div className="p-6">
                    <textarea value={message} onChange={e => setMessage(e.target.value)} className="w-full h-48 bg-input border border-border rounded-xl p-4 text-sm text-foreground focus:border-emerald-500/40 resize-none font-mono" />
                </div>
                {sendResult && <div className={`mx-6 mb-4 p-4 rounded-xl border text-sm ${sendResult.success ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>{sendResult.success ? 'Success!' : sendResult.error}</div>}
                <div className="p-6 border-t border-border flex justify-end gap-3">
                    <button onClick={() => window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`, '_blank')} className="px-5 py-3 rounded-xl border border-[#25D366]/30 text-[#25D366] text-sm font-bold flex items-center gap-2 hover:bg-[#25D366]/5 transition-all">
                        <WhatsAppIcon className="w-4 h-4" /> Manual WA
                    </button>
                    <button onClick={handleSendFonnte} disabled={sending || !waPhone} className="px-6 py-3 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-sm shadow-[0_0_15px_rgba(37,211,102,0.3)] disabled:opacity-50 flex items-center gap-2 transition-all">
                        {sending ? <Loader2 className="animate-spin" /> : <WhatsAppIcon className="w-4 h-4" />} Send via Fonnte
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Lead Form Modal ────────────────────────
function LeadModal({ lead, onClose, onSave }: { lead?: Lead | null, onClose: () => void, onSave: (data: Partial<Lead>) => void }) {
    const [formData, setFormData] = useState<Partial<Lead>>({
        title: '', company: '', location: '', status: 'new',
        email: '', phone: '', source: 'Manual', url: '', description: ''
    });

    useEffect(() => {
        if (lead) setFormData(lead);
    }, [lead]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-card border border-border rounded-2xl w-full max-w-3xl shadow-2xl relative" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-border flex justify-between items-center">
                    <h2 className="text-xl font-bold text-foreground">{lead ? 'Edit Lead' : 'Add New Lead'}</h2>
                    <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground hover:text-foreground" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-muted-foreground uppercase tracking-widest block mb-2">Lead Name / Title</label>
                            <input name="title" value={formData.title} onChange={handleChange} className="w-full bg-input border border-border rounded-xl px-4 py-3 text-foreground focus:border-blue-500/50 outline-none" required />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground uppercase tracking-widest block mb-2">Company / Organization</label>
                            <input name="company" value={formData.company} onChange={handleChange} className="w-full bg-input border border-border rounded-xl px-4 py-3 text-foreground focus:border-blue-500/50 outline-none" required />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground uppercase tracking-widest block mb-2">Email</label>
                            <input name="email" value={formData.email || ''} onChange={handleChange} className="w-full bg-input border border-border rounded-xl px-4 py-3 text-foreground focus:border-blue-500/50 outline-none" />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground uppercase tracking-widest block mb-2">Phone</label>
                            <input name="phone" value={formData.phone || ''} onChange={handleChange} className="w-full bg-input border border-border rounded-xl px-4 py-3 text-foreground focus:border-blue-500/50 outline-none" />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground uppercase tracking-widest block mb-2">Location</label>
                            <input name="location" value={formData.location || ''} onChange={handleChange} className="w-full bg-input border border-border rounded-xl px-4 py-3 text-foreground focus:border-blue-500/50 outline-none" />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground uppercase tracking-widest block mb-2">Website / URL</label>
                            <input name="url" value={formData.url || ''} onChange={handleChange} className="w-full bg-input border border-border rounded-xl px-4 py-3 text-foreground focus:border-blue-500/50 outline-none" />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground uppercase tracking-widest block mb-2">Source</label>
                            <select name="source" value={formData.source} onChange={handleChange} className="w-full bg-input border border-border rounded-xl px-4 py-3 text-foreground focus:border-blue-500/50 outline-none">
                                <option value="Manual" className="bg-popover text-popover-foreground">Manual Input</option>
                                <option value="LinkedIn" className="bg-popover text-popover-foreground">LinkedIn</option>
                                <option value="Google Maps" className="bg-popover text-popover-foreground">Google Maps</option>
                                <option value="Upwork" className="bg-popover text-popover-foreground">Upwork</option>
                                <option value="Instagram" className="bg-popover text-popover-foreground">Instagram</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground uppercase tracking-widest block mb-2">Status</label>
                            <select name="status" value={formData.status} onChange={handleChange} className="w-full bg-input border border-border rounded-xl px-4 py-3 text-foreground focus:border-blue-500/50 outline-none">
                                <option value="new" className="bg-popover text-popover-foreground">New</option>
                                <option value="contacted" className="bg-popover text-popover-foreground">Contacted</option>
                                <option value="interested" className="bg-popover text-popover-foreground">Interested</option>
                                <option value="won" className="bg-popover text-popover-foreground">Won</option>
                                <option value="rejected" className="bg-popover text-popover-foreground">Rejected</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs text-muted-foreground uppercase tracking-widest block mb-2">Description / Notes</label>
                        <textarea name="description" value={formData.description || ''} onChange={handleChange} className="w-full bg-input border border-border rounded-xl px-4 py-3 text-foreground focus:border-blue-500/50 outline-none h-24 resize-none" />
                    </div>
                    <div className="flex justify-end pt-4">
                        <button type="button" onClick={onClose} className="px-6 py-2.5 text-muted-foreground hover:text-foreground mr-2">Cancel</button>
                        <button type="submit" className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20">Save Lead</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Main Leads Page ────────────────────────
export default function LeadsPage() {
    const [waLead, setWaLead] = useState<Lead | null>(null);
    const [editLead, setEditLead] = useState<Lead | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [myName, setMyName] = useState('Mahin');

    const [filterSource, setFilterSource] = useState('all');
    const [filterScore, setFilterScore] = useState('all');
    const [filterLabel, setFilterLabel] = useState('All Time');
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);
    // SWR for Leads with dynamic date range
    const params = new URLSearchParams();
    if (dateRange?.start) params.append('start_date', dateRange.start);
    if (dateRange?.end) params.append('end_date', dateRange.end);
    const queryString = params.toString() ? `?${params.toString()}` : '';

    const { data: leadsData, error: leadsError, mutate: mutateLeads } = useSWR<Lead[]>(`${api.API_URL}/api/leads${queryString}`, fetcher);
    const { data: settings } = useSWR(`${api.API_URL}/api/settings`, fetcher);

    useEffect(() => {
        if (settings?.user_display_name) setMyName(settings.user_display_name);
    }, [settings]);

    const leads = leadsData || [];
    const loading = !leadsData && !leadsError;



    const applyDateFilter = (days: number | 'all') => {
        if (days === 'all') { setDateRange(null); setFilterLabel('All Time'); return; }
        const end = new Date();
        const start = new Date();
        if (days === 0) setFilterLabel('Today');
        else if (days === 1) { start.setDate(start.getDate() - 1); end.setDate(end.getDate() - 1); setFilterLabel('Yesterday'); }
        else { start.setDate(start.getDate() - days); setFilterLabel(`Last ${days} Days`); }
        setDateRange({ start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] });
    };

    const handleCreate = async (data: Partial<Lead>) => {
        try {
            await api.createLead(data);
            setShowCreateModal(false);
            mutateLeads();
        } catch (e) { alert('Failed to create lead'); }
    };

    const handleUpdate = async (data: Partial<Lead>) => {
        if (!editLead) return;
        try {
            await api.updateLead(editLead.id, data);
            setEditLead(null);
            mutateLeads();
        } catch (e) { alert('Failed to update lead'); }
    };

    const handleDelete = async (id: number) => {
        setDeleteId(id);
        setShowConfirm(true);
    };

    const executeDelete = async () => {
        if (!deleteId) return;
        try {
            await api.deleteLead(deleteId);
            setShowConfirm(false);
            setDeleteId(null);
            mutateLeads();
        } catch (e) { alert('Failed to delete lead'); }
    };

    const filteredLeads = leads.filter(lead => {
        const matchSource = filterSource === 'all' || lead.source === filterSource;
        const matchScore = filterScore === 'all' || (filterScore === 'high' && (lead.match_score || 0) >= 75) || (filterScore === 'mid' && (lead.match_score || 0) >= 50 && (lead.match_score || 0) < 75) || (filterScore === 'low' && (lead.match_score || 0) < 50);
        const matchSearch = !searchQuery || lead.title.toLowerCase().includes(searchQuery.toLowerCase()) || lead.company.toLowerCase().includes(searchQuery.toLowerCase()) || lead.location.toLowerCase().includes(searchQuery.toLowerCase());
        return matchSource && matchScore && matchSearch;
    });

    return (
        <div className="w-full">
            <div className="mb-8 flex flex-col xl:flex-row xl:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-bold text-foreground tracking-tight flex items-center gap-3">
                        <Database className="w-8 h-8 text-emerald-500" /> Leads Database
                    </h1>
                    <p className="text-muted-foreground mt-2 text-lg">{leads.length} leads found · {filterLabel}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="bg-accent/20 p-1 rounded-xl border border-border flex items-center">
                        <button onClick={() => applyDateFilter('all')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filterLabel === 'All Time' ? 'bg-blue-600 text-white shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}>All</button>
                        <button onClick={() => applyDateFilter(0)} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filterLabel === 'Today' ? 'bg-blue-600 text-white shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}>Today</button>
                        <button onClick={() => applyDateFilter(7)} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filterLabel.includes('7 Days') ? 'bg-blue-600 text-white shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}>7 Days</button>
                    </div>
                    <select value={filterSource} onChange={(e) => setFilterSource(e.target.value)} className="appearance-none px-4 py-3 glass-panel rounded-xl text-muted-foreground text-sm bg-accent/20 border border-border focus:outline-none focus:border-blue-500/30 cursor-pointer">
                        <option value="all" className="bg-popover text-popover-foreground">All Sources</option>
                        {Array.from(new Set(leads.map(l => l.source))).map(s => <option key={s} value={s} className="bg-popover text-popover-foreground">{s}</option>)}
                    </select>
                    <button onClick={() => setShowSearch(!showSearch)} className={`p-3 glass-panel rounded-xl transition-colors ${showSearch ? 'text-blue-500 border-blue-500/30' : 'text-muted-foreground hover:text-foreground'}`}><Search className="w-5 h-5" /></button>
                    <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3 rounded-xl transition-all font-bold shadow-lg shadow-emerald-500/20"><Plus className="w-5 h-5" /> Add Lead</button>
                </div>
            </div>

            {showSearch && (
                <div className="mb-6 relative">
                    <Search className="w-4 h-4 text-muted-foreground absolute left-5 top-1/2 -translate-y-1/2" />
                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search..." className="w-full bg-input border border-border rounded-xl py-3 px-12 text-foreground focus:outline-none focus:border-blue-500/30" autoFocus />
                </div>
            )}

            <div className="glass-panel rounded-3xl overflow-hidden min-h-[500px] relative">
                {loading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground"><Loader2 className="w-10 h-10 animate-spin mb-4 text-emerald-500" /><p className="font-mono text-sm tracking-widest uppercase">Loading...</p></div>
                ) : filteredLeads.length === 0 ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground"><p className="text-lg">No leads found.</p></div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-accent/20 border-b border-border text-xs font-mono text-muted-foreground uppercase tracking-widest">
                                    <th className="px-6 py-5">Target</th>
                                    <th className="px-6 py-5">Score</th>
                                    <th className="px-6 py-5">Contact</th>
                                    <th className="px-6 py-5">Location</th>
                                    <th className="px-6 py-5">Source</th>
                                    <th className="px-6 py-5">Status</th>
                                    <th className="px-6 py-5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredLeads.map((lead) => (
                                    <tr key={lead.id} className="hover:bg-accent/10 transition-colors group">
                                        <td className="px-6 py-5">
                                            <div className="font-medium text-foreground group-hover:text-emerald-500 transition-colors max-w-[200px] truncate">{lead.title}</div>
                                            <div className="text-xs text-muted-foreground">{lead.company} {lead.rating && `• ★${lead.rating}`}</div>
                                        </td>
                                        <td className="px-6 py-5"><MatchBadge score={lead.match_score} /></td>
                                        <td className="px-6 py-5">
                                            {lead.phone ? <span className="text-xs font-mono text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" /> {lead.phone}</span> : <span className="text-xs text-muted-foreground">-</span>}
                                        </td>
                                        <td className="px-6 py-5 text-muted-foreground max-w-[120px] truncate">{lead.location}</td>
                                        <td className="px-6 py-5"><SourceBadge source={lead.source} /></td>
                                        <td className="px-6 py-5"><StatusBadge status={lead.status} /></td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => setWaLead(lead)} className="p-2 rounded-lg bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 transition-all" title="WhatsApp"><WhatsAppIcon className="w-4 h-4" /></button>
                                                <button onClick={() => setEditLead(lead)} className="p-2 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500/20" title="Edit"><Edit className="w-4 h-4" /></button>
                                                <button onClick={() => handleDelete(lead.id)} className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20" title="Delete"><Trash2 className="w-4 h-4" /></button>
                                                {lead.url && <a href={lead.url} target="_blank" className="p-2 rounded-lg bg-accent/20 text-muted-foreground hover:text-foreground"><ExternalLink className="w-4 h-4" /></a>}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {waLead && <WAModal lead={waLead} onClose={() => setWaLead(null)} templates={DEFAULT_TEMPLATES} myName={myName} />}
            {showCreateModal && <LeadModal onClose={() => setShowCreateModal(false)} onSave={handleCreate} />}
            {editLead && <LeadModal lead={editLead} onClose={() => setEditLead(null)} onSave={handleUpdate} />}

            <ConfirmModal
                isOpen={showConfirm}
                title="Delete Lead"
                message="Are you sure you want to delete this lead? This will also remove all related projects, tasks, and history. This action cannot be undone."
                onConfirm={executeDelete}
                onCancel={() => {
                    setShowConfirm(false);
                    setDeleteId(null);
                }}
            />
        </div>
    );
}
