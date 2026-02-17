'use client';

import React, { useEffect, useState, useMemo } from 'react';
import useSWR from 'swr';
import { api, fetcher, Prospect } from '@/lib/api';
import {
    Loader2, Search, X, Phone, Building2, MapPin, Globe, Mail,
    Plus, Edit, Trash2, ExternalLink, Star, Download, Wand2
} from 'lucide-react';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Pagination } from '@/components/ui/Pagination';
import { ScoreBadge, StatusBadge } from '@/components/shared/Badges';
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon';
import * as XLSX from 'xlsx';

// ─── WA Message Templates (moved from Leads) ────────────────────────
const WA_TEMPLATES = [
    {
        id: 'pesantren', label: 'Pesantren',
        message: `Assalamualaikum Wr. Wb.\n\nPerkenalkan saya {{nama_saya}}, seorang web developer profesional. Saya menemukan {{nama_prospect}} di Google Maps dan melihat bahwa saat ini belum memiliki website resmi.\n\nSaya ingin menawarkan jasa pembuatan website untuk {{nama_prospect}} yang mencakup:\n✅ Profil pesantren & visi misi\n✅ Pendaftaran santri online\n✅ Galeri kegiatan\n✅ Informasi kurikulum\n✅ Kontak & lokasi\n\nDengan website, calon wali santri bisa lebih mudah menemukan informasi tentang pesantren Bapak/Ibu.\n\nApakah berkenan untuk saya jelaskan lebih lanjut? Jazakallahu khairan. 🙏`,
    },
    {
        id: 'sekolah', label: 'Sekolah',
        message: `Assalamualaikum/Selamat siang,\n\nPerkenalkan saya {{nama_saya}}, fullstack developer. Saya melihat {{nama_prospect}} belum memiliki website resmi.\n\nDi era digital ini, website sekolah sangat penting untuk:\n✅ Informasi PPDB online\n✅ Profil sekolah & prestasi\n✅ Portal siswa & orang tua\n✅ Agenda & pengumuman\n✅ Galeri kegiatan\n\nSaya bisa membuatkan website profesional yang modern dan responsive. Apakah Bapak/Ibu berkenan untuk diskusi lebih lanjut?\n\nTerima kasih. 🙏`,
    },
    {
        id: 'umkm', label: 'UMKM',
        message: `Halo Kak, selamat siang 👋\n\nPerkenalkan saya {{nama_saya}}, web developer. Saya menemukan {{nama_prospect}} di pencarian Google dan tertarik untuk menawarkan jasa pembuatan website.\n\nDengan website, bisnis Kakak bisa:\n🚀 Ditemukan lebih mudah di Google\n📱 Terlihat profesional & terpercaya\n📦 Tampilkan katalog produk/jasa\n💬 Customer bisa order/konsultasi online\n📊 Track pengunjung & performa\n\nSaya bisa buatkan website yang keren & affordable. Boleh saya jelaskan paketnya? 😊`,
    },
    {
        id: 'general', label: 'Umum',
        message: `Halo, selamat siang 👋\n\nPerkenalkan saya {{nama_saya}}, seorang fullstack developer profesional.\n\nSaya melihat {{nama_prospect}} dan ingin menawarkan jasa pembuatan aplikasi/website yang bisa membantu digitalisasi bisnis Bapak/Ibu.\n\nLayanan saya meliputi:\n✅ Website company profile\n✅ Aplikasi manajemen internal\n✅ Sistem informasi custom\n✅ E-commerce & katalog online\n\nApakah berkenan untuk berdiskusi? Terima kasih. 🙏`,
    },
];

// ─── WA Outreach Modal ────────────────────────
function WAModal({ prospect, onClose, myName }: { prospect: Prospect; onClose: () => void; myName: string }) {
    const [selectedTemplate, setSelectedTemplate] = useState('pesantren');
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [personalizing, setPersonalizing] = useState(false);
    const [sendResult, setSendResult] = useState<{ success: boolean; error?: string } | null>(null);

    useEffect(() => {
        const tpl = WA_TEMPLATES.find(t => t.id === selectedTemplate);
        if (tpl) {
            let filled = tpl.message;
            filled = filled.split('{{nama_prospect}}').join(prospect.name);
            filled = filled.split('{{nama_saya}}').join(myName || 'Mahin');
            filled = filled.split('{{lokasi}}').join(prospect.address || '');
            setMessage(filled);
        }
    }, [selectedTemplate, prospect, myName]);

    const waPhone = prospect.phone.replace(/[\s\-()]/g, '').replace(/[^\d+]/g, '').replace(/^0/, '62').replace(/^\+/, '');

    const handleSendFonnte = async () => {
        if (!waPhone || !message) return;
        setSending(true);
        try {
            const result = await api.sendWA(waPhone, message);
            setSendResult(result);
        } catch { setSendResult({ success: false, error: 'Network error' }); }
        finally { setSending(false); }
    };

    const handleAIPersonalize = async () => {
        setPersonalizing(true);
        try {
            const res = await api.personalizeMessage(prospect);
            setMessage(res.message);
            // Also switch to a custom state to show AI result
        } catch (err) {
            alert('AI Personalization failed');
        } finally {
            setPersonalizing(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-card border border-border rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <h3 className="text-foreground font-bold text-lg flex items-center gap-2"><WhatsAppIcon className="w-5 h-5 text-[#25D366]" /> Outreach — {prospect.name}</h3>
                    <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground hover:text-foreground" /></button>
                </div>
                <div className="p-6 border-b border-border">
                    <div className="flex flex-wrap gap-2 items-center">
                        {WA_TEMPLATES.map(tpl => (
                            <button key={tpl.id} onClick={() => setSelectedTemplate(tpl.id)} className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${selectedTemplate === tpl.id ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-500' : 'bg-muted/20 border-border text-muted-foreground'}`}>{tpl.label}</button>
                        ))}
                        <div className="flex-1" />
                        <button
                            onClick={handleAIPersonalize}
                            disabled={personalizing}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50"
                        >
                            {personalizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                            {personalizing ? 'Analyzing...' : 'Generate via AI ✨'}
                        </button>
                    </div>
                </div>
                <div className="p-6">
                    <textarea value={message} onChange={e => setMessage(e.target.value)} className="w-full h-48 bg-input border border-border rounded-xl p-4 text-sm text-foreground focus:border-emerald-500/40 resize-none font-mono" />
                </div>
                {sendResult && <div className={`mx-6 mb-4 p-4 rounded-xl border text-sm ${sendResult.success ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>{sendResult.success ? 'Pesan terkirim!' : sendResult.error}</div>}
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

// ─── Prospect Form Modal ────────────────────────
function ProspectFormModal({ prospect, onClose, onSave }: { prospect?: Prospect | null; onClose: () => void; onSave: (data: Partial<Prospect>) => void }) {
    const [formData, setFormData] = useState<Partial<Prospect>>({
        name: '', category: 'Local Business', address: '', phone: '',
        email: '', website: '', status: 'new', has_website: false,
    });

    useEffect(() => {
        if (prospect) setFormData(prospect);
    }, [prospect]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-card border border-border rounded-2xl w-full max-w-3xl shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-border flex justify-between items-center">
                    <h2 className="text-xl font-bold text-foreground">{prospect ? 'Edit Prospect' : 'Add Prospect'}</h2>
                    <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground hover:text-foreground" /></button>
                </div>
                <form onSubmit={e => { e.preventDefault(); onSave(formData); }} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-muted-foreground uppercase tracking-widest block mb-2">Business Name</label>
                            <input name="name" value={formData.name} onChange={handleChange} className="w-full bg-input border border-border rounded-xl px-4 py-3 text-foreground focus:border-blue-500/50 outline-none" required />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground uppercase tracking-widest block mb-2">Category</label>
                            <input name="category" value={formData.category} onChange={handleChange} className="w-full bg-input border border-border rounded-xl px-4 py-3 text-foreground focus:border-blue-500/50 outline-none" />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground uppercase tracking-widest block mb-2">Phone (WA) *</label>
                            <input name="phone" value={formData.phone || ''} onChange={handleChange} className="w-full bg-input border border-border rounded-xl px-4 py-3 text-foreground focus:border-blue-500/50 outline-none" required />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground uppercase tracking-widest block mb-2">Email</label>
                            <input name="email" value={formData.email || ''} onChange={handleChange} className="w-full bg-input border border-border rounded-xl px-4 py-3 text-foreground focus:border-blue-500/50 outline-none" />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground uppercase tracking-widest block mb-2">Website</label>
                            <input name="website" value={formData.website || ''} onChange={handleChange} className="w-full bg-input border border-border rounded-xl px-4 py-3 text-foreground focus:border-blue-500/50 outline-none" />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground uppercase tracking-widest block mb-2">Status</label>
                            <select name="status" value={formData.status} onChange={handleChange} className="w-full bg-input border border-border rounded-xl px-4 py-3 text-foreground focus:border-blue-500/50 outline-none">
                                <option value="new" className="bg-popover text-popover-foreground">New</option>
                                <option value="contacted" className="bg-popover text-popover-foreground">Contacted</option>
                                <option value="negotiation" className="bg-popover text-popover-foreground">Negotiation</option>
                                <option value="won" className="bg-popover text-popover-foreground">Won</option>
                                <option value="lost" className="bg-popover text-popover-foreground">Lost</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs text-muted-foreground uppercase tracking-widest block mb-2">Address</label>
                        <textarea name="address" value={formData.address || ''} onChange={handleChange} className="w-full bg-input border border-border rounded-xl px-4 py-3 text-foreground focus:border-blue-500/50 outline-none h-20 resize-none" />
                    </div>
                    <div className="flex justify-end pt-4">
                        <button type="button" onClick={onClose} className="px-6 py-2.5 text-muted-foreground hover:text-foreground mr-2">Cancel</button>
                        <button type="submit" className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20">Save</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── MAIN PROSPECTS PAGE ────────────────────────
export default function ProspectsPage() {
    const [waProspect, setWaProspect] = useState<Prospect | null>(null);
    const [editProspect, setEditProspect] = useState<Prospect | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [myName, setMyName] = useState('Mahin');

    // Filters
    const [filterCategory, setFilterCategory] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterWebsite, setFilterWebsite] = useState('all');
    const [filterScore, setFilterScore] = useState('all');
    const [filterLabel, setFilterLabel] = useState('All Time');
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);

    const params = new URLSearchParams();
    if (dateRange?.start) params.append('start_date', dateRange.start);
    if (dateRange?.end) params.append('end_date', dateRange.end);
    const queryString = params.toString() ? `?${params.toString()}` : '';

    const { data: prospectsData, error: prospectsError, mutate } = useSWR<Prospect[]>(`${api.API_URL}/api/prospects${queryString}`, fetcher);
    const { data: settings } = useSWR(`${api.API_URL}/api/settings`, fetcher);

    useEffect(() => {
        if (settings?.user_display_name) setMyName(settings.user_display_name);
    }, [settings]);

    const prospects = prospectsData || [];
    const loading = !prospectsData && !prospectsError;

    const applyDateFilter = (days: number | 'all') => {
        if (days === 'all') { setDateRange(null); setFilterLabel('All Time'); setCurrentPage(1); return; }
        const end = new Date();
        const start = new Date();
        if (days === 0) setFilterLabel('Today');
        else if (days === 1) { start.setDate(start.getDate() - 1); end.setDate(end.getDate() - 1); setFilterLabel('Yesterday'); }
        else { start.setDate(start.getDate() - days); setFilterLabel(`Last ${days} Days`); }
        setDateRange({ start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] });
        setCurrentPage(1);
    };

    const handleCreate = async (data: Partial<Prospect>) => {
        try { await api.createProspect(data); setShowCreateModal(false); mutate(); } catch { alert('Failed to create prospect'); }
    };

    const handleUpdate = async (data: Partial<Prospect>) => {
        if (!editProspect) return;
        try { await api.updateProspect(editProspect.id, data); setEditProspect(null); mutate(); } catch { alert('Failed to update prospect'); }
    };

    const handleDelete = (id: number) => { setDeleteId(id); setShowConfirm(true); };

    const executeDelete = async () => {
        if (!deleteId) return;
        try { await api.deleteProspect(deleteId); setShowConfirm(false); setDeleteId(null); mutate(); } catch { alert('Failed to delete prospect'); }
    };

    const handleExport = () => {
        const exportData = filteredProspects.map(p => ({
            Name: p.name, Category: p.category, Address: p.address || '',
            Phone: p.phone, Email: p.email || '', Website: p.website || '',
            Rating: p.rating || '', Reviews: p.review_count || '',
            Score: p.match_score || '', Status: p.status, MapsURL: p.maps_url || '',
        }));
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Prospects');
        XLSX.writeFile(wb, `prospects_export_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const filteredProspects = useMemo(() => {
        return prospects.filter(p => {
            const matchCat = filterCategory === 'all' || p.category.toLowerCase().includes(filterCategory.toLowerCase());
            const matchStatus = filterStatus === 'all' || p.status === filterStatus;
            const matchWebsite = filterWebsite === 'all'
                || (filterWebsite === 'yes' && p.has_website)
                || (filterWebsite === 'no' && !p.has_website);
            const matchScore = filterScore === 'all'
                || (filterScore === 'high' && (p.match_score || 0) >= 75)
                || (filterScore === 'mid' && (p.match_score || 0) >= 50 && (p.match_score || 0) < 75)
                || (filterScore === 'low' && (p.match_score || 0) < 50);
            const matchSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || (p.address || '').toLowerCase().includes(searchQuery.toLowerCase()) || p.phone.includes(searchQuery);
            return matchCat && matchStatus && matchWebsite && matchScore && matchSearch;
        });
    }, [prospects, filterCategory, filterStatus, filterWebsite, filterScore, searchQuery]);

    // Reset page when filters change
    useEffect(() => { setCurrentPage(1); }, [filterCategory, filterStatus, filterWebsite, filterScore, searchQuery]);

    const paginatedProspects = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredProspects.slice(start, start + pageSize);
    }, [filteredProspects, currentPage, pageSize]);

    const categories = [...new Set(prospects.map(p => p.category))];
    const noWebCount = prospects.filter(p => !p.has_website).length;

    return (
        <div className="w-full">
            <div className="mb-8 flex flex-col xl:flex-row xl:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-bold text-foreground tracking-tight flex items-center gap-3">
                        <Building2 className="w-8 h-8 text-blue-500" /> Prospects
                    </h1>
                    <p className="text-muted-foreground mt-2 text-lg">
                        {filteredProspects.length} of {prospects.length} prospects · {noWebCount} tanpa website · {filterLabel}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    {/* Date filter */}
                    <div className="bg-accent/20 p-1 rounded-xl border border-border flex items-center">
                        <button onClick={() => applyDateFilter('all')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filterLabel === 'All Time' ? 'bg-blue-600 text-white shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}>All</button>
                        <button onClick={() => applyDateFilter(0)} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filterLabel === 'Today' ? 'bg-blue-600 text-white shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}>Today</button>
                        <button onClick={() => applyDateFilter(7)} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filterLabel.includes('7') ? 'bg-blue-600 text-white shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}>7d</button>
                        <button onClick={() => applyDateFilter(30)} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filterLabel.includes('30') ? 'bg-blue-600 text-white shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}>30d</button>
                    </div>
                    {/* Category filter */}
                    <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="appearance-none px-4 py-3 rounded-xl text-muted-foreground text-sm bg-accent/20 border border-border focus:outline-none focus:border-blue-500/30 cursor-pointer">
                        <option value="all" className="bg-popover text-popover-foreground">All Categories</option>
                        {categories.map(c => <option key={c} value={c} className="bg-popover text-popover-foreground">{c}</option>)}
                    </select>
                    {/* Status filter */}
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="appearance-none px-4 py-3 rounded-xl text-muted-foreground text-sm bg-accent/20 border border-border focus:outline-none focus:border-blue-500/30 cursor-pointer">
                        <option value="all" className="bg-popover text-popover-foreground">All Status</option>
                        <option value="new" className="bg-popover text-popover-foreground">New</option>
                        <option value="contacted" className="bg-popover text-popover-foreground">Contacted</option>
                        <option value="negotiation" className="bg-popover text-popover-foreground">Negotiation</option>
                        <option value="won" className="bg-popover text-popover-foreground">Won</option>
                        <option value="lost" className="bg-popover text-popover-foreground">Lost</option>
                    </select>
                    {/* Website filter */}
                    <select value={filterWebsite} onChange={e => setFilterWebsite(e.target.value)} className="appearance-none px-4 py-3 rounded-xl text-muted-foreground text-sm bg-accent/20 border border-border focus:outline-none focus:border-blue-500/30 cursor-pointer">
                        <option value="all" className="bg-popover text-popover-foreground">All Website</option>
                        <option value="no" className="bg-popover text-popover-foreground">⭐ Belum Ada</option>
                        <option value="yes" className="bg-popover text-popover-foreground">Ada Website</option>
                    </select>
                    {/* Score filter */}
                    <select value={filterScore} onChange={e => setFilterScore(e.target.value)} className="appearance-none px-4 py-3 rounded-xl text-muted-foreground text-sm bg-accent/20 border border-border focus:outline-none focus:border-blue-500/30 cursor-pointer">
                        <option value="all" className="bg-popover text-popover-foreground">All Scores</option>
                        <option value="high" className="bg-popover text-popover-foreground">High (≥75)</option>
                        <option value="mid" className="bg-popover text-popover-foreground">Mid (50–74)</option>
                        <option value="low" className="bg-popover text-popover-foreground">Low (&lt;50)</option>
                    </select>
                    <button onClick={() => setShowSearch(!showSearch)} className={`p-3 rounded-xl border transition-colors ${showSearch ? 'text-blue-500 border-blue-500/30 bg-blue-500/5' : 'text-muted-foreground hover:text-foreground border-border bg-accent/20'}`}><Search className="w-5 h-5" /></button>
                    <button onClick={handleExport} className="p-3 rounded-xl text-muted-foreground hover:text-foreground border border-border bg-accent/20 transition-colors" title="Export Excel"><Download className="w-5 h-5" /></button>
                    <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3 rounded-xl transition-all font-bold shadow-lg shadow-emerald-500/20"><Plus className="w-5 h-5" /> Add</button>
                </div>
            </div>

            {showSearch && (
                <div className="mb-6 relative">
                    <Search className="w-4 h-4 text-muted-foreground absolute left-5 top-1/2 -translate-y-1/2" />
                    <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search name, address, phone..." className="w-full bg-input border border-border rounded-xl py-3 px-12 text-foreground focus:outline-none focus:border-blue-500/30" autoFocus />
                </div>
            )}

            <div className="glass-panel rounded-3xl overflow-hidden min-h-[500px] relative flex flex-col">
                {loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground py-20"><Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-500" /><p className="font-mono text-sm tracking-widest uppercase">Loading...</p></div>
                ) : filteredProspects.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground py-20"><Building2 className="w-16 h-16 mb-4 opacity-20" /><p className="text-lg">No prospects found.</p><p className="text-sm mt-1">Scrape Google Maps to get prospects with phone numbers.</p></div>
                ) : (
                    <>
                        <div className="overflow-x-auto flex-1">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-accent/20 border-b border-border text-xs font-mono text-muted-foreground uppercase tracking-widest">
                                        <th className="px-6 py-5">Business</th>
                                        <th className="px-6 py-5">Score</th>
                                        <th className="px-6 py-5">WA / Phone</th>
                                        <th className="px-6 py-5">Location</th>
                                        <th className="px-6 py-5">Website</th>
                                        <th className="px-6 py-5">Status</th>
                                        <th className="px-6 py-5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {paginatedProspects.map(prospect => (
                                        <tr key={prospect.id} className="hover:bg-accent/10 transition-colors group">
                                            <td className="px-6 py-5">
                                                <div className="font-medium text-foreground group-hover:text-blue-500 transition-colors max-w-[200px] truncate">{prospect.name}</div>
                                                <div className="text-xs text-muted-foreground flex items-center gap-1">
                                                    {prospect.category}
                                                    {prospect.rating && <span className="ml-1 flex items-center gap-0.5"><Star className="w-3 h-3 text-amber-400 fill-amber-400" />{prospect.rating}</span>}
                                                    {prospect.review_count && <span className="text-muted-foreground/50">({prospect.review_count})</span>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5"><ScoreBadge score={prospect.match_score} /></td>
                                            <td className="px-6 py-5">
                                                <span className="text-xs font-mono text-emerald-500 flex items-center gap-1"><Phone className="w-3 h-3" /> {prospect.phone}</span>
                                                {prospect.email && <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5"><Mail className="w-2.5 h-2.5" /> {prospect.email}</span>}
                                            </td>
                                            <td className="px-6 py-5 text-muted-foreground text-xs max-w-[150px] truncate"><MapPin className="w-3 h-3 inline mr-1" />{prospect.address || '-'}</td>
                                            <td className="px-6 py-5">
                                                {prospect.has_website ? (
                                                    <a href={prospect.website} target="_blank" rel="noopener" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"><Globe className="w-3 h-3" /> Ada</a>
                                                ) : (
                                                    <span className="text-xs text-amber-500 font-bold">⭐ Belum ada</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-5"><StatusBadge status={prospect.status} /></td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => setWaProspect(prospect)} className="p-2 rounded-lg bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 transition-all" title="WhatsApp"><WhatsAppIcon className="w-4 h-4" /></button>
                                                    <button onClick={() => setEditProspect(prospect)} className="p-2 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500/20" title="Edit"><Edit className="w-4 h-4" /></button>
                                                    <button onClick={() => handleDelete(prospect.id)} className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20" title="Delete"><Trash2 className="w-4 h-4" /></button>
                                                    {prospect.maps_url && <a href={prospect.maps_url} target="_blank" className="p-2 rounded-lg bg-accent/20 text-muted-foreground hover:text-foreground" title="Google Maps"><ExternalLink className="w-4 h-4" /></a>}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <Pagination
                            currentPage={currentPage}
                            totalItems={filteredProspects.length}
                            pageSize={pageSize}
                            onPageChange={setCurrentPage}
                            onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
                        />
                    </>
                )}
            </div>

            {waProspect && <WAModal prospect={waProspect} onClose={() => setWaProspect(null)} myName={myName} />}
            {showCreateModal && <ProspectFormModal onClose={() => setShowCreateModal(false)} onSave={handleCreate} />}
            {editProspect && <ProspectFormModal prospect={editProspect} onClose={() => setEditProspect(null)} onSave={handleUpdate} />}

            <ConfirmModal
                isOpen={showConfirm}
                title="Delete Prospect"
                message="Are you sure you want to delete this prospect? This action cannot be undone."
                onConfirm={executeDelete}
                onCancel={() => { setShowConfirm(false); setDeleteId(null); }}
            />
        </div>
    );
}
