'use client';

import React, { useState, useMemo } from 'react';
import useSWR from 'swr';
import { FileText, Download, FilePlus, CheckSquare, Sparkles, Loader2, Globe, Building2, Briefcase, Search, Clock, History, Send, Phone, X } from 'lucide-react';
import { api, fetcher, Lead, Prospect } from '@/lib/api';
import jsPDF from 'jspdf';

// ─── Types ────────────────────────
interface ProposalContent {
    client_type: string;
    greeting: string;
    summary: string;
    problem_analysis: string;
    offerings: { title: string; description: string; deliverables: string[] }[];
    timeline: string;
    pricing_strategy: string;
    why_us: string;
    next_steps: string;
}

// ─── Proposal History (localStorage) ────────────────────────
const HISTORY_KEY = 'velora_proposal_history';

interface ProposalHistoryItem {
    id: string;
    clientName: string;
    clientType: 'lead' | 'prospect';
    date: string;
    category: string;
}

function getHistory(): ProposalHistoryItem[] {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
    catch { return []; }
}

function addToHistory(item: ProposalHistoryItem) {
    const history = getHistory();
    const updated = [item, ...history.filter(h => h.id !== item.id)].slice(0, 50);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}

// ─── PDF Constants ────────────────────────
const ML = 25;   // margin left
const MR = 25;   // margin right
const MT = 30;   // margin top (body pages)
const MB = 40;   // margin bottom
const PW = 210;  // page width A4
const PH = 297;  // page height A4
const CW = PW - ML - MR; // content width = 160

export default function DocumentsPage() {
    const { data: leadsData } = useSWR<Lead[]>(`${api.API_URL}/api/leads`, fetcher);
    const { data: prospectsData } = useSWR<Prospect[]>(`${api.API_URL}/api/prospects`, fetcher);

    const combinedClients = useMemo(() => [
        ...(leadsData || []).map(l => ({ ...l, clientType: 'lead' as const })),
        ...(prospectsData || []).map(p => ({
            id: p.id, title: p.name, company: p.category, location: p.address,
            clientType: 'prospect' as const, has_website: p.has_website,
            rating: p.rating, category: p.category,
            description: `Kategori: ${p.category} | Rating: ${p.rating || 'N/A'}`
        }))
    ].sort((a, b) => b.id - a.id), [leadsData, prospectsData]);

    // ─── State ────────────────────────
    const [activeTab, setActiveTab] = useState<'generate' | 'history'>('generate');
    const [searchQuery, setSearchQuery] = useState('');
    const [clientFilter, setClientFilter] = useState<'all' | 'lead' | 'prospect'>('all');
    const [history, setHistory] = useState<ProposalHistoryItem[]>(() => getHistory());
    const historyIds = new Set(history.map(h => `${h.clientType}-${h.id}`));

    const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
    const [selectedClientType, setSelectedClientType] = useState<'lead' | 'prospect' | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [aiContent, setAiContent] = useState<ProposalContent | null>(null);

    // WA Send states
    const [showWaSend, setShowWaSend] = useState(false);
    const [waPhone, setWaPhone] = useState('');
    const [waMessage, setWaMessage] = useState('');
    const [isSendingWa, setIsSendingWa] = useState(false);
    const [lastPdfBase64, setLastPdfBase64] = useState<string | null>(null);
    const [lastPdfFilename, setLastPdfFilename] = useState('');

    const filteredClients = useMemo(() => {
        return combinedClients.filter(c => {
            const matchType = clientFilter === 'all' || c.clientType === clientFilter;
            const matchSearch = !searchQuery ||
                c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (c.company || '').toLowerCase().includes(searchQuery.toLowerCase());
            return matchType && matchSearch;
        });
    }, [combinedClients, searchQuery, clientFilter]);

    const handleGenerateAiProposal = async () => {
        const client = combinedClients.find(c => c.id === selectedClientId && c.clientType === selectedClientType);
        if (!client) return;
        setIsAiLoading(true);
        try {
            const result = await api.generateAiProposal(client);
            setAiContent(result);
        } catch { alert('AI Generation failed.'); }
        finally { setIsAiLoading(false); }
    };

    // ─── PDF Generation (Fixed) ────────────────────────
    const generateProposal = (downloadOnly = false) => {
        setIsGenerating(true);
        const client = combinedClients.find(c => c.id === selectedClientId && c.clientType === selectedClientType);
        if (!client) { setIsGenerating(false); return; }

        const doc = new jsPDF({ unit: 'mm', format: 'a4' });
        let y = MT;

        // ─── Helper: auto page break ────────────────────────
        const checkPage = (needed: number) => {
            if (y + needed > PH - MB) {
                doc.addPage();
                y = MT;
            }
        };

        // ─── Helper: draw section header ────────────────────────
        const sectionHeader = (title: string, color: [number, number, number]) => {
            checkPage(25);
            doc.setFillColor(color[0], color[1], color[2]);
            doc.rect(ML, y, 4, 10, 'F');
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(15, 23, 42);
            doc.text(title, ML + 8, y + 7);
            y += 16;
        };

        // ─── Helper: draw paragraph ────────────────────────
        const paragraph = (text: string, fontSize = 10) => {
            doc.setFontSize(fontSize);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(51, 65, 85);
            const lines = doc.splitTextToSize(text, CW);
            const lineHeight = fontSize * 0.45;
            for (let i = 0; i < lines.length; i++) {
                checkPage(lineHeight + 2);
                doc.text(lines[i], ML, y);
                y += lineHeight;
            }
            y += 4;
        };

        // ════════════════════════════════════════════════════
        // PAGE 1: COVER
        // ════════════════════════════════════════════════════
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, PW, PH, 'F');

        // Left accent bar
        doc.setFillColor(59, 130, 246);
        doc.rect(0, 0, 5, PH, 'F');

        // Logo area
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(36);
        doc.setFont('helvetica', 'bold');
        doc.text('VELORA', ML, 75);

        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text('DIGITAL SOLUTIONS', ML, 85);

        // Divider
        doc.setDrawColor(75, 85, 99);
        doc.setLineWidth(0.3);
        doc.line(ML, 100, PW - MR, 100);

        // Title
        doc.setFontSize(26);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('PROPOSAL', ML, 120);

        const clientType = aiContent?.client_type || 'business';
        const typeLabel = clientType === 'islamic' ? 'Pesantren / Lembaga Islami'
            : clientType === 'school' ? 'Lembaga Pendidikan' : 'Solusi Digital Bisnis';
        doc.setFontSize(13);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text(typeLabel, ML, 130);

        // Client info block
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text('PREPARED FOR', ML, 160);

        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        const splitName = doc.splitTextToSize(client.title, CW);
        doc.text(splitName, ML, 172);
        const nameHeight = splitName.length * 8;

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text(client.company || '', ML, 172 + nameHeight + 2);
        doc.text(client.location || 'Indonesia', ML, 172 + nameHeight + 10);

        // Date
        const dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text(`Tanggal: ${dateStr}`, ML, 220);

        // Footer
        doc.setFontSize(7);
        doc.setTextColor(75, 85, 99);
        doc.text('Dokumen ini bersifat rahasia | Velora Jobs © 2026', ML, PH - 15);

        // ════════════════════════════════════════════════════
        // PAGE 2+: BODY CONTENT
        // ════════════════════════════════════════════════════
        doc.addPage();
        y = MT;

        // Greeting
        if (aiContent?.greeting) {
            doc.setFontSize(11);
            doc.setFont('helvetica', 'italic');
            doc.setTextColor(59, 130, 246);
            const greetLines = doc.splitTextToSize(aiContent.greeting, CW);
            doc.text(greetLines, ML, y);
            y += greetLines.length * 5 + 8;
        }

        // ── EXECUTIVE SUMMARY ──
        sectionHeader('Ringkasan Eksekutif', [59, 130, 246]);
        const summary = aiContent?.summary || `Kami di Velora Jobs berkomitmen membantu ${client.company || client.title} meningkatkan skala bisnis melalui transformasi digital yang tepat sasaran.`;
        paragraph(summary);

        // ── PROBLEM ANALYSIS ──
        if (aiContent?.problem_analysis) {
            sectionHeader('Analisis Kebutuhan', [245, 158, 11]);
            paragraph(aiContent.problem_analysis);
        }

        // ── SOLUTIONS ──
        const offerings = aiContent?.offerings || [
            { title: 'Website Profesional', description: 'Website modern dan responsif untuk meningkatkan kepercayaan calon pelanggan.', deliverables: ['Company profile', 'Landing page SEO-friendly', 'Integrasi WhatsApp'] },
            { title: 'Optimasi Digital', description: 'Tingkatkan visibilitas online dan jangkauan digital Anda.', deliverables: ['Google Maps listing', 'SEO on-page', 'Analytics & tracking'] }
        ];

        sectionHeader('Solusi yang Kami Tawarkan', [16, 185, 129]);

        offerings.forEach((off, idx) => {
            const boxH = 18 + off.deliverables.length * 6;
            checkPage(boxH + 6);

            // Card background
            doc.setFillColor(248, 250, 252);
            doc.roundedRect(ML, y, CW, boxH, 2, 2, 'F');

            // Number badge
            doc.setFillColor(59, 130, 246);
            doc.circle(ML + 8, y + 7, 3, 'F');
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(255, 255, 255);
            doc.text(`${idx + 1}`, ML + 6.8, y + 8.5);

            // Title
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(15, 23, 42);
            doc.text(off.title, ML + 15, y + 8.5);

            // Description
            doc.setFontSize(8.5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 116, 139);
            doc.text(off.description, ML + 15, y + 14);

            // Deliverables
            let dy = y + 20;
            off.deliverables.forEach((del) => {
                doc.setFillColor(16, 185, 129);
                doc.circle(ML + 12, dy - 0.5, 1, 'F');
                doc.setFontSize(8.5);
                doc.setTextColor(51, 65, 85);
                doc.text(del, ML + 16, dy);
                dy += 6;
            });

            y += boxH + 6;
        });

        // ── TIMELINE ──
        sectionHeader('Timeline Pengerjaan', [139, 92, 246]);
        const timeline = aiContent?.timeline || 'Estimasi pengerjaan 4-8 minggu, tergantung kompleksitas dan skala implementasi yang disepakati.';
        paragraph(timeline);

        // ── PRICING ──
        sectionHeader('Strategi Investasi', [16, 185, 129]);
        const pricing = aiContent?.pricing_strategy || 'Investasi bersifat fleksibel dan disesuaikan dengan cakupan fitur yang dipilih. Kami menyediakan opsi pembayaran bertahap untuk kenyamanan Anda.';
        paragraph(pricing);

        // ── WHY US ──
        sectionHeader('Mengapa Velora Jobs?', [59, 130, 246]);
        const whyUs = aiContent?.why_us || 'Velora Jobs menggabungkan desain premium dengan strategi digital terukur. Tim kami berpengalaman membantu UMKM, lembaga pendidikan, dan pesantren bertransformasi digital.';
        paragraph(whyUs);

        // ── NEXT STEPS ──
        sectionHeader('Langkah Selanjutnya', [245, 158, 11]);
        const nextSteps = aiContent?.next_steps || 'Hubungi kami untuk konsultasi GRATIS 30 menit. Kami siap membantu Anda memulai perjalanan transformasi digital.';
        paragraph(nextSteps);

        // ── Contact CTA box ──
        checkPage(30);
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(ML, y, CW, 22, 3, 3, 'F');
        doc.setFillColor(59, 130, 246);
        doc.roundedRect(ML, y, CW, 22, 3, 3, 'S');
        doc.setDrawColor(59, 130, 246);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(59, 130, 246);
        doc.text('Hubungi Kami', ML + CW / 2, y + 9, { align: 'center' });
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text('WhatsApp: 0857-xxxx-xxxx  |  Email: hello@velora.my.id  |  Web: ve-lora.my.id', ML + CW / 2, y + 16, { align: 'center' });

        // ════════════════════════════════════════════════════
        // FOOTERS on all pages
        // ════════════════════════════════════════════════════
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            // Footer line
            doc.setDrawColor(229, 231, 235);
            doc.setLineWidth(0.3);
            doc.line(ML, PH - 20, PW - MR, PH - 20);
            // Footer text
            doc.setFontSize(7);
            doc.setTextColor(148, 163, 184);
            if (i > 1) { // skip cover page footer text
                doc.text('Velora Digital Solutions — Confidential', ML, PH - 15);
                doc.text(`${i - 1} / ${pageCount - 1}`, PW - MR, PH - 15, { align: 'right' });
            }
        }

        const titleSlug = client.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const filename = `Velora_Proposal_${titleSlug}.pdf`;

        // Save PDF as base64 for WA sending
        const pdfBase64 = doc.output('datauristring').split(',')[1];
        setLastPdfBase64(pdfBase64);
        setLastPdfFilename(filename);

        // Download
        doc.save(filename);

        // Save to history
        const histItem: ProposalHistoryItem = {
            id: `${client.clientType}-${client.id}`,
            clientName: client.title,
            clientType: client.clientType,
            date: new Date().toISOString(),
            category: client.company || '',
        };
        addToHistory(histItem);
        setHistory(getHistory());

        // Pre-fill WA message
        setWaMessage(`Assalamu'alaikum, berikut proposal dari Velora Jobs untuk ${client.title}. Silakan ditinjau, terima kasih! 🙏`);

        setIsGenerating(false);
    };

    // ─── Send PDF via WA (Fonnte) ────────────────────────
    const handleSendWA = async () => {
        if (!waPhone || !lastPdfBase64) return;
        setIsSendingWa(true);
        try {
            const res = await fetch(`${api.API_URL}/api/wa/send-document`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                body: JSON.stringify({
                    target: waPhone,
                    message: waMessage,
                    file: lastPdfBase64,
                    filename: lastPdfFilename,
                }),
            });
            const data = await res.json();
            if (data.success) {
                alert('✅ Proposal berhasil dikirim via WhatsApp!');
                setShowWaSend(false);
            } else {
                alert(`❌ Gagal: ${data.error || 'Unknown error'}`);
            }
        } catch (e) {
            alert('❌ Network error. Pastikan backend running.');
        } finally {
            setIsSendingWa(false);
        }
    };

    const loading = !leadsData && !prospectsData;

    return (
        <div className="w-full h-[calc(100vh-8rem)] flex flex-col gap-4">
            {/* ─── HEADER ─── */}
            <div className="flex justify-between items-center flex-shrink-0">
                <div>
                    <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                        <FileText className="w-8 h-8 text-emerald-500" />
                        Documents & Proposals
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">Generate professional PDFs for your leads & prospects</p>
                </div>
                <div className="bg-accent/20 p-1 rounded-xl border border-border flex items-center">
                    <button onClick={() => setActiveTab('generate')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${activeTab === 'generate' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}>
                        <Sparkles className="w-3.5 h-3.5" /> Generate
                    </button>
                    <button onClick={() => setActiveTab('history')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${activeTab === 'history' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}>
                        <History className="w-3.5 h-3.5" /> History {history.length > 0 && `(${history.length})`}
                    </button>
                </div>
            </div>

            {/* ─── HISTORY TAB ─── */}
            {activeTab === 'history' && (
                <div className="flex-1 overflow-y-auto">
                    {history.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-center opacity-50">
                            <History className="w-16 h-16 text-muted-foreground/30 mb-4" />
                            <h3 className="text-lg font-bold text-foreground">Belum ada riwayat</h3>
                            <p className="text-sm text-muted-foreground mt-1">Proposal yang di-generate akan muncul di sini</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {history.map((h, i) => (
                                <div key={i} className="flex items-center gap-4 p-4 bg-card border border-border rounded-2xl hover:border-emerald-500/30 transition-all">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${h.clientType === 'lead' ? 'bg-blue-500/10 text-blue-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                        {h.clientType === 'lead' ? <Briefcase className="w-5 h-5" /> : <Globe className="w-5 h-5" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-foreground text-sm truncate">{h.clientName}</p>
                                        <p className="text-xs text-muted-foreground">{h.category}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {new Date(h.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </p>
                                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border mt-1 inline-block ${h.clientType === 'lead' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                                            {h.clientType}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ─── GENERATE TAB ─── */}
            {activeTab === 'generate' && (
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 min-h-0">
                    {/* Step 1: Select Client */}
                    <div className="bg-card/40 backdrop-blur-xl p-6 rounded-[2rem] border border-border/50 flex flex-col shadow-xl overflow-hidden">
                        <h2 className="text-base font-bold text-foreground mb-4 flex items-center gap-3 flex-shrink-0">
                            <span className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center text-sm font-bold border border-blue-500/20">1</span>
                            Target Selection
                        </h2>
                        <div className="flex gap-2 mb-4 flex-shrink-0">
                            <div className="relative flex-1">
                                <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Cari nama atau kategori..."
                                    className="w-full bg-input border border-border rounded-xl py-2 pl-9 pr-3 text-sm text-foreground focus:outline-none focus:border-blue-500/30" />
                            </div>
                            <div className="bg-accent/20 p-0.5 rounded-xl border border-border flex items-center">
                                {(['all', 'lead', 'prospect'] as const).map(f => (
                                    <button key={f} onClick={() => setClientFilter(f)}
                                        className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all capitalize ${clientFilter === f ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:text-foreground'}`}>
                                        {f}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-2 overflow-y-auto pr-1 flex-1 scrollbar-hide">
                            {loading && <div className="flex items-center justify-center py-20 text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin" /></div>}
                            {!loading && filteredClients.length === 0 && <p className="text-center py-10 text-muted-foreground text-sm">Tidak ada data ditemukan.</p>}
                            {filteredClients.map(client => {
                                const hasProposal = historyIds.has(`${client.clientType}-${client.id}`);
                                const isSelected = selectedClientId === client.id && selectedClientType === client.clientType;
                                return (
                                    <div key={`${client.clientType}-${client.id}`}
                                        onClick={() => { setSelectedClientId(client.id); setSelectedClientType(client.clientType); setAiContent(null); }}
                                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer group active:scale-[0.98] ${isSelected
                                            ? 'bg-blue-600/10 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.15)] text-blue-500'
                                            : 'bg-accent/10 border-border/30 hover:border-blue-500/30 text-muted-foreground hover:bg-accent/20'}`}>
                                        <div className="flex justify-between items-start">
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-bold text-sm truncate group-hover:text-foreground transition-colors">{client.title}</span>
                                                    {client.clientType === 'lead' ? <Briefcase className="w-3 h-3 opacity-50 shrink-0" /> : <Globe className="w-3 h-3 opacity-50 shrink-0" />}
                                                </div>
                                                <p className="text-[10px] opacity-70 flex items-center gap-1 font-medium"><Building2 className="w-3 h-3" /> {client.company}</p>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                {hasProposal && <span className="text-[9px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">✓ Proposal</span>}
                                                {isSelected && <CheckSquare className="w-4 h-4 text-blue-500" />}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Step 2: Generation Setup */}
                    <div className={`p-6 rounded-[2rem] border flex flex-col transition-all shadow-xl overflow-hidden ${selectedClientId ? 'bg-card/40 border-border/50 opacity-100' : 'bg-accent/5 border-dashed border-border/50 opacity-40'}`}>
                        <div className="flex items-center justify-between mb-6 flex-shrink-0">
                            <h2 className="text-base font-bold text-foreground flex items-center gap-3">
                                <span className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-sm font-bold border border-emerald-500/20">2</span>
                                Proposal Engine
                            </h2>
                            {aiContent && <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 text-[10px] font-bold border border-blue-500/20"><Sparkles className="w-3 h-3" /> AI READY</span>}
                        </div>

                        {!selectedClientId ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                                <div className="p-6 rounded-3xl bg-accent/10 border border-border/50"><FilePlus className="w-12 h-12 text-muted-foreground opacity-30" /></div>
                                <div>
                                    <h3 className="text-lg font-bold text-muted-foreground">Awaiting Target</h3>
                                    <p className="text-sm text-muted-foreground/60 max-w-[200px] mt-1">Select a client from the database to start the proposal engine.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col space-y-5 overflow-hidden">
                                <div className="flex-1 overflow-y-auto space-y-5 pr-1 scrollbar-hide">
                                    {/* AI Action Bar */}
                                    <div className="p-5 rounded-3xl bg-gradient-to-br from-blue-600/10 to-emerald-500/10 border border-blue-500/20 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-3 opacity-20"><Sparkles className="w-8 h-8 text-blue-500" /></div>
                                        <h4 className="font-bold text-blue-500 mb-1 text-sm">Velora AI Intel</h4>
                                        <p className="text-xs text-muted-foreground mb-4">Generate specialized proposal with problem analysis, solutions & deliverables using GLM-4.</p>
                                        <button onClick={handleGenerateAiProposal} disabled={isAiLoading}
                                            className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg ${aiContent ? 'bg-blue-600/10 text-blue-500 border border-blue-500/20 hover:bg-blue-600/20' : 'bg-blue-600 text-white hover:bg-blue-500'}`}>
                                            {isAiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                            {aiContent ? 'REGENERATE DRAFT' : 'GENERATE AI DRAFT'}
                                        </button>
                                    </div>

                                    {aiContent && (
                                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                            <div className="flex items-center gap-2">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${aiContent.client_type === 'islamic' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : aiContent.client_type === 'school' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                                                    {aiContent.client_type === 'islamic' ? '🕌 Pesantren/Islami' : aiContent.client_type === 'school' ? '🏫 Pendidikan' : '💼 Bisnis/UMKM'}
                                                </span>
                                            </div>
                                            <div>
                                                <h5 className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.2em] mb-2">Executive Summary</h5>
                                                <p className="text-xs text-foreground/90 leading-relaxed italic border-l-2 border-blue-500/30 pl-4">{aiContent.summary}</p>
                                            </div>
                                            <div>
                                                <h5 className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.2em] mb-2">Analisis Kebutuhan</h5>
                                                <p className="text-xs text-foreground/90 leading-relaxed border-l-2 border-amber-500/30 pl-4">{aiContent.problem_analysis}</p>
                                            </div>
                                            <div>
                                                <h5 className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.2em] mb-2">Proposed Solutions</h5>
                                                <div className="space-y-2">
                                                    {aiContent.offerings.map((off, i) => (
                                                        <div key={i} className="bg-accent/10 p-3 rounded-xl border border-border/30">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
                                                                <span className="text-xs font-bold text-foreground">{off.title}</span>
                                                            </div>
                                                            <p className="text-[10px] text-muted-foreground mb-1.5 pl-5">{off.description}</p>
                                                            <div className="pl-5 space-y-1">
                                                                {off.deliverables.map((del, j) => (
                                                                    <div key={j} className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                                                                        <div className="w-1 h-1 rounded-full bg-emerald-500" />
                                                                        {del}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="bg-accent/10 p-3 rounded-xl border border-border/30">
                                                    <h6 className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1">Timeline</h6>
                                                    <p className="text-[10px] text-foreground/80">{aiContent.timeline}</p>
                                                </div>
                                                <div className="bg-accent/10 p-3 rounded-xl border border-border/30">
                                                    <h6 className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1">Investasi</h6>
                                                    <p className="text-[10px] text-foreground/80">{aiContent.pricing_strategy}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                <div className="space-y-3 flex-shrink-0">
                                    <button onClick={() => generateProposal()} disabled={isGenerating || !selectedClientId}
                                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-3xl font-bold flex items-center justify-center gap-3 transition-all shadow-[0_20px_40px_-15px_rgba(16,185,129,0.3)] hover:translate-y-[-2px] active:translate-y-[0] disabled:opacity-40">
                                        {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                                        EXPORT & DOWNLOAD PDF
                                    </button>

                                    {lastPdfBase64 && (
                                        <button onClick={() => setShowWaSend(true)}
                                            className="w-full bg-[#25D366] hover:bg-[#20ba59] text-white py-3.5 rounded-3xl font-bold flex items-center justify-center gap-3 transition-all shadow-[0_20px_40px_-15px_rgba(37,211,102,0.3)] hover:translate-y-[-2px] active:translate-y-[0]">
                                            <Send className="w-5 h-5" />
                                            KIRIM VIA WHATSAPP
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ─── WA SEND MODAL ─── */}
            {showWaSend && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowWaSend(false)}>
                    <div className="bg-card border border-border rounded-3xl p-8 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                                <Send className="w-5 h-5 text-[#25D366]" />
                                Kirim Proposal via WA
                            </h3>
                            <button onClick={() => setShowWaSend(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs text-muted-foreground uppercase tracking-widest mb-2">Nomor WhatsApp</label>
                                <div className="relative">
                                    <Phone className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                                    <input type="tel" value={waPhone} onChange={e => setWaPhone(e.target.value)}
                                        placeholder="08xxxxxxxxxx" className="w-full bg-input border border-border rounded-xl py-3 pl-10 pr-4 text-foreground focus:border-[#25D366]/50 outline-none" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs text-muted-foreground uppercase tracking-widest mb-2">Pesan</label>
                                <textarea value={waMessage} onChange={e => setWaMessage(e.target.value)} rows={3}
                                    className="w-full bg-input border border-border rounded-xl p-3 text-foreground text-sm focus:border-[#25D366]/50 outline-none resize-none" />
                            </div>
                            <div className="p-3 bg-muted/30 rounded-xl border border-border/50 flex items-center gap-3">
                                <FileText className="w-8 h-8 text-red-500 shrink-0" />
                                <div className="min-w-0">
                                    <p className="text-xs font-bold text-foreground truncate">{lastPdfFilename}</p>
                                    <p className="text-[10px] text-muted-foreground">PDF Proposal — siap dikirim</p>
                                </div>
                            </div>
                            <button onClick={handleSendWA} disabled={!waPhone || isSendingWa}
                                className="w-full bg-[#25D366] hover:bg-[#20ba59] text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-40">
                                {isSendingWa ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                {isSendingWa ? 'Mengirim...' : 'Kirim Sekarang'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
