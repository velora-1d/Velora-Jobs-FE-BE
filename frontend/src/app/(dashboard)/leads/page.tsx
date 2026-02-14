'use client';

import React, { useEffect, useState } from 'react';
import { api, Lead } from '@/lib/api';
import {
    Loader2, ExternalLink, Database, Search, Download, Zap,
    MessageCircle, X, Copy, Check, Send, ChevronDown, Phone,
    Building2, School, ShoppingBag, Briefcase, CheckCircle2, XCircle
} from 'lucide-react';

// ─── Pre-built Message Templates ────────────────────────
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

// ─── Match Badge Component ────────────────────────
function MatchBadge({ score }: { score?: number }) {
    if (score === undefined || score === null) {
        return (
            <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-slate-500/10 text-slate-500 border border-slate-500/20 uppercase tracking-wider">
                N/A
            </span>
        );
    }

    let color = 'bg-red-500/10 text-red-400 border-red-500/20';
    let label = 'Low';

    if (score >= 75) {
        color = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.15)]';
        label = 'High';
    } else if (score >= 50) {
        color = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
        label = 'Mid';
    }

    return (
        <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${color}`}>
                {label}
            </span>
            <span className="text-[10px] text-slate-600 font-mono">{score}%</span>
        </div>
    );
}

// ─── Source Badge ────────────────────────
function SourceBadge({ source }: { source: string }) {
    const colors: Record<string, string> = {
        'LinkedIn': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        'Upwork': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        'Indeed': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
        'Glints': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
        'Google Maps': 'bg-red-500/10 text-red-400 border-red-500/20',
    };
    return (
        <span className={`px-2 py-1 rounded text-[10px] font-bold border uppercase tracking-wider ${colors[source] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
            {source}
        </span>
    );
}

// ─── Status Badge ────────────────────────
function StatusBadge({ status }: { status: string }) {
    const map: Record<string, string> = {
        'new': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        'contacted': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        'interested': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        'rejected': 'bg-red-500/10 text-red-400 border-red-500/20',
        'won': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    };
    return (
        <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-widest ${map[status] || map['new']}`}>
            {status}
        </span>
    );
}

// ─── WA Outreach Modal ────────────────────────
function WAModal({
    lead,
    onClose,
    templates,
    myName
}: {
    lead: Lead;
    onClose: () => void;
    templates: typeof DEFAULT_TEMPLATES;
    myName: string;
}) {
    const [selectedTemplate, setSelectedTemplate] = useState(templates[0]?.id || '');
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [sendResult, setSendResult] = useState<{ success: boolean; error?: string } | null>(null);

    useEffect(() => {
        const tpl = templates.find(t => t.id === selectedTemplate);
        if (tpl) {
            let filled = tpl.message;
            filled = filled.split('{{nama_lead}}').join(lead.title);
            filled = filled.split('{{nama_saya}}').join(myName || 'Mahin');
            filled = filled.split('{{lokasi}}').join(lead.location);
            filled = filled.split('{{company}}').join(lead.company);
            setMessage(filled);
        }
    }, [selectedTemplate, lead, myName, templates]);

    const getPhoneNumber = () => {
        const ph = lead.phone || '';
        if (!ph && lead.description) {
            const match = lead.description.match(/(?:Telp|Phone|HP|WA)[:\s]*([\d\-+\s()]+)/i);
            return match ? match[1].replace(/[\s\-()]/g, '') : '';
        }
        return ph.replace(/[\s\-()]/g, '');
    };

    const formatPhoneForWA = (p: string) => {
        let num = p.replace(/[^\d+]/g, '');
        if (num.startsWith('0')) num = '62' + num.slice(1);
        if (num.startsWith('+')) num = num.slice(1);
        return num;
    };

    const phone = getPhoneNumber();
    const waPhone = formatPhoneForWA(phone);

    const handleManualWA = () => {
        const url = `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };

    const handleSendFonnte = async () => {
        if (!waPhone || !message) return;
        setSending(true);
        setSendResult(null);
        try {
            const result = await api.sendWA(waPhone, message, lead.id);
            setSendResult(result);
        } catch {
            setSendResult({ success: false, error: 'Network error' });
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-[#0f1117] border border-[#ffffff10] rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-[#ffffff08]">
                    <div>
                        <h3 className="text-white font-bold text-lg flex items-center gap-2">
                            <MessageCircle className="w-5 h-5 text-emerald-400" />
                            Outreach — {lead.title}
                        </h3>
                        <p className="text-slate-500 text-xs mt-1 font-mono">{lead.company} · {lead.location}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-[#ffffff10] rounded-xl transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Template Selector */}
                <div className="p-6 border-b border-[#ffffff08]">
                    <div className="flex flex-wrap gap-2">
                        {templates.map((tpl) => (
                            <button
                                key={tpl.id}
                                onClick={() => setSelectedTemplate(tpl.id)}
                                className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all flex items-center gap-2 ${selectedTemplate === tpl.id
                                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                                    : 'bg-[#ffffff03] border-[#ffffff08] text-slate-500 hover:text-white'
                                    }`}
                            >
                                <tpl.Icon className="w-4 h-4" />
                                {tpl.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Message Editor */}
                <div className="p-6 space-y-4">
                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="w-full h-48 bg-black/40 border border-[#ffffff10] rounded-xl p-4 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/40 resize-none font-mono leading-relaxed"
                    />
                </div>

                {/* Send Result Feedback */}
                {sendResult && (
                    <div className={`mx-6 mb-4 p-4 rounded-xl border text-sm flex items-center gap-3 ${sendResult.success
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : 'bg-red-500/10 border-red-500/20 text-red-400'
                        }`}>
                        {sendResult.success
                            ? <><CheckCircle2 className="w-5 h-5 flex-shrink-0" /> Pesan berhasil dikirim via Fonnte!</>
                            : <><XCircle className="w-5 h-5 flex-shrink-0" /> Gagal: {sendResult.error}</>
                        }
                    </div>
                )}

                {/* Dual Actions */}
                <div className="p-6 border-t border-[#ffffff08] flex items-center justify-end gap-3">
                    {waPhone ? (
                        <>
                            <button
                                onClick={handleManualWA}
                                className="flex items-center gap-2 px-5 py-3 rounded-xl border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 font-bold text-sm transition-all"
                            >
                                <ExternalLink className="w-4 h-4" />
                                Manual (WA Web)
                            </button>
                            <button
                                onClick={handleSendFonnte}
                                disabled={sending || sendResult?.success}
                                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                Kirim via Fonnte
                            </button>
                        </>
                    ) : (
                        <p className="text-red-400 text-sm">No phone number available.</p>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Main Leads Page ────────────────────────
export default function LeadsPage() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [waLead, setWaLead] = useState<Lead | null>(null);
    const [myName, setMyName] = useState('Mahin');

    // Filtering State
    const [filterSource, setFilterSource] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearch, setShowSearch] = useState(false);

    // Date Filtering
    const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);
    const [filterLabel, setFilterLabel] = useState('All Time');

    const fetchData = async () => {
        setLoading(true);
        try {
            const [leadsData, settings] = await Promise.all([
                api.getLeads(dateRange?.start, dateRange?.end),
                api.getSettings(),
            ]);
            setLeads(leadsData);
            if (settings.user_display_name) setMyName(settings.user_display_name);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [dateRange]); // Refetch when date range changes

    // Quick Date Filters
    const applyDateFilter = (days: number | 'all') => {
        if (days === 'all') {
            setDateRange(null);
            setFilterLabel('All Time');
            return;
        }

        const end = new Date();
        const start = new Date();

        if (days === 0) {
            // Today
            setFilterLabel('Today');
        } else if (days === 1) {
            // Yesterday
            start.setDate(start.getDate() - 1);
            end.setDate(end.getDate() - 1);
            setFilterLabel('Yesterday');
        } else {
            // Last N days
            start.setDate(start.getDate() - days);
            setFilterLabel(`Last ${days} Days`);
        }

        setDateRange({
            start: start.toISOString().split('T')[0],
            end: end.toISOString().split('T')[0]
        });
    };

    const uniqueSources = ['all', ...Array.from(new Set(leads.map(l => l.source)))];

    const filteredLeads = leads.filter(lead => {
        const matchSource = filterSource === 'all' || lead.source === filterSource;
        const matchSearch = !searchQuery ||
            lead.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            lead.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
            lead.location.toLowerCase().includes(searchQuery.toLowerCase());
        return matchSource && matchSearch;
    });

    return (
        <div className="w-full">
            <div className="mb-8 flex flex-col xl:flex-row xl:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-bold text-white tracking-tight flex items-center gap-3">
                        <Database className="w-8 h-8 text-emerald-400 fill-emerald-400/20" />
                        Leads Database
                    </h1>
                    <p className="text-slate-400 mt-2 text-lg">
                        {leads.length} leads found · {filterLabel}
                    </p>
                </div>

                {/* ─── Hybrid Filter Bar ─── */}
                <div className="flex flex-wrap items-center gap-3">
                    <div className="bg-[#ffffff03] p-1 rounded-xl border border-[#ffffff08] flex items-center">
                        <button onClick={() => applyDateFilter('all')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filterLabel === 'All Time' ? 'bg-blue-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>All</button>
                        <button onClick={() => applyDateFilter(0)} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filterLabel === 'Today' ? 'bg-blue-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Today</button>
                        <button onClick={() => applyDateFilter(7)} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filterLabel.includes('7 Days') ? 'bg-blue-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>7 Days</button>
                    </div>

                    <div className="flex items-center gap-2 bg-[#ffffff03] p-1 rounded-xl border border-[#ffffff08]">
                        <input
                            type="date"
                            className="bg-transparent text-slate-300 text-xs px-2 py-1 focus:outline-none"
                            onChange={(e) => {
                                const start = e.target.value;
                                setDateRange(prev => ({ start, end: prev?.end || start }));
                                setFilterLabel('Custom');
                            }}
                        />
                        <span className="text-slate-600">-</span>
                        <input
                            type="date"
                            className="bg-transparent text-slate-300 text-xs px-2 py-1 focus:outline-none"
                            onChange={(e) => {
                                const end = e.target.value;
                                setDateRange(prev => ({ start: prev?.start || end, end }));
                                setFilterLabel('Custom');
                            }}
                        />
                    </div>

                    <div className="relative">
                        <select
                            value={filterSource}
                            onChange={(e) => setFilterSource(e.target.value)}
                            className="appearance-none px-4 py-3 pr-10 glass-panel rounded-xl text-slate-300 text-sm bg-transparent border border-[#ffffff08] focus:outline-none focus:border-blue-500/30 cursor-pointer"
                        >
                            {uniqueSources.map(s => (
                                <option key={s} value={s} className="bg-[#0f1117]">{s === 'all' ? 'All Sources' : s}</option>
                            ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    <button
                        onClick={() => setShowSearch(!showSearch)}
                        className={`p-3 glass-panel rounded-xl transition-colors ${showSearch ? 'text-blue-400 border-blue-500/30' : 'text-slate-400 hover:text-white hover:border-[#ffffff20]'}`}
                    >
                        <Search className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {showSearch && (
                <div className="mb-6 relative group">
                    <Search className="w-4 h-4 text-slate-500 absolute left-5 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search leads by name, company, or location..."
                        className="w-full bg-[#000000]/40 border border-[#ffffff10] rounded-xl py-3 px-12 text-slate-200 focus:outline-none focus:border-blue-500/30 placeholder:text-slate-700"
                        autoFocus
                    />
                </div>
            )}

            <div className="glass-panel rounded-3xl overflow-hidden min-h-[500px] relative">
                {loading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
                        <Loader2 className="w-10 h-10 animate-spin mb-4 text-emerald-400" />
                        <p className="font-mono text-sm tracking-widest uppercase">Loading leads...</p>
                    </div>
                ) : filteredLeads.length === 0 ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600">
                        <div className="p-4 rounded-full bg-[#ffffff03] mb-4">
                            <Search className="w-8 h-8 opacity-50" />
                        </div>
                        <p className="text-lg">No leads found for this period.</p>
                        <p className="text-sm mt-2 opacity-50">Try changing the date filter.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[#ffffff02] border-b border-[#ffffff05] text-xs font-mono text-slate-500 uppercase tracking-widest">
                                    <th className="px-6 py-5">Target</th>
                                    <th className="px-6 py-5">
                                        <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-amber-400" /> Score</span>
                                    </th>
                                    <th className="px-6 py-5">Contact</th>
                                    <th className="px-6 py-5">Email</th>
                                    <th className="px-6 py-5">Organization</th>
                                    <th className="px-6 py-5">Location</th>
                                    <th className="px-6 py-5">Source</th>
                                    <th className="px-6 py-5">Status</th>
                                    <th className="px-6 py-5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#ffffff03]">
                                {filteredLeads.map((lead) => (
                                    <tr key={lead.id} className="hover:bg-[#ffffff03] transition-colors group">
                                        <td className="px-6 py-5">
                                            <div className="font-medium text-slate-200 group-hover:text-emerald-400 transition-colors max-w-[200px] truncate">{lead.title}</div>
                                            {lead.rating && (
                                                <div className="flex items-center gap-1 mt-1">
                                                    <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">★ {lead.rating}</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-5">
                                            <MatchBadge score={lead.match_score} />
                                        </td>
                                        <td className="px-6 py-5">
                                            {lead.phone ? (
                                                <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                                                    <Phone className="w-3 h-3" /> {lead.phone}
                                                </span>
                                            ) : <span className="text-xs text-slate-600">-</span>}
                                        </td>
                                        <td className="px-6 py-5">
                                            {lead.email ? (
                                                <a href={`mailto:${lead.email}`} className="text-xs font-mono text-blue-400 hover:underline flex items-center gap-1">
                                                    @ {lead.email}
                                                </a>
                                            ) : <span className="text-xs text-slate-600">-</span>}
                                        </td>
                                        <td className="px-6 py-5 text-slate-400 max-w-[150px] truncate">{lead.company}</td>
                                        <td className="px-6 py-5 text-slate-500 max-w-[120px] truncate">{lead.location}</td>
                                        <td className="px-6 py-5">
                                            <SourceBadge source={lead.source} />
                                        </td>
                                        <td className="px-6 py-5">
                                            <StatusBadge status={lead.status} />
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => setWaLead(lead)}
                                                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 transition-all text-xs font-bold border border-emerald-500/20"
                                                    title="WhatsApp Outreach"
                                                >
                                                    <MessageCircle className="w-3.5 h-3.5" />
                                                    <span className="hidden lg:inline">WA</span>
                                                </button>

                                                <a
                                                    href={lead.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[#ffffff05] hover:bg-blue-500/20 text-slate-400 hover:text-blue-400 transition-all"
                                                    title="Open Link"
                                                >
                                                    <ExternalLink className="w-4 h-4" />
                                                </a>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {waLead && (
                <WAModal
                    lead={waLead}
                    onClose={() => setWaLead(null)}
                    templates={DEFAULT_TEMPLATES}
                    myName={myName}
                />
            )}
        </div>
    );
}
