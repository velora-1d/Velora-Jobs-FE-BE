'use client';

import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import { FileText, Download, FilePlus, ChevronRight, CheckSquare, Sparkles, Loader2, Globe, Building2, Briefcase } from 'lucide-react';
import { api, fetcher, Lead, Prospect } from '@/lib/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Type for the new rich AI proposal content
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

export default function DocumentsPage() {
    // SWR
    const { data: leadsData } = useSWR<Lead[]>(`${api.API_URL}/api/leads`, fetcher);
    const { data: prospectsData } = useSWR<Prospect[]>(`${api.API_URL}/api/prospects`, fetcher);

    const combinedClients = [
        ...(leadsData || []).map(l => ({ ...l, clientType: 'lead' as const })),
        ...(prospectsData || []).map(p => ({
            id: p.id,
            title: p.name,
            company: p.category,
            location: p.address,
            clientType: 'prospect' as const,
            has_website: p.has_website,
            rating: p.rating,
            category: p.category,
            description: `Kategori: ${p.category} | Rating: ${p.rating || 'N/A'}`
        }))
    ].sort((a, b) => b.id - a.id);

    const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
    const [selectedClientType, setSelectedClientType] = useState<'lead' | 'prospect' | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [aiContent, setAiContent] = useState<ProposalContent | null>(null);

    const handleGenerateAiProposal = async () => {
        const client = combinedClients.find(c => c.id === selectedClientId && c.clientType === selectedClientType);
        if (!client) return;

        setIsAiLoading(true);
        try {
            const result = await api.generateAiProposal(client);
            setAiContent(result);
        } catch (e) {
            alert('AI Generation failed. Falling back to default.');
        } finally {
            setIsAiLoading(false);
        }
    };

    const generateProposal = () => {
        setIsGenerating(true);
        const client = combinedClients.find(c => c.id === selectedClientId && c.clientType === selectedClientType);
        if (!client) return;

        const doc = new jsPDF();

        // ═══ PAGE 1: COVER ═══
        doc.setFillColor(15, 23, 42); // Slate-900
        doc.rect(0, 0, 210, 297, 'F');

        // Decorative accent line
        doc.setFillColor(59, 130, 246);
        doc.rect(0, 0, 6, 297, 'F');

        // Company name
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(32);
        doc.setFont('helvetica', 'bold');
        doc.text('VELORA', 25, 80);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text('DIGITAL SOLUTIONS', 25, 90);

        // Proposal title
        doc.setFontSize(28);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('PROPOSAL', 25, 130);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);

        const clientType = aiContent?.client_type || 'business';
        const typeLabel = clientType === 'islamic' ? 'Pesantren / Lembaga Islami'
            : clientType === 'school' ? 'Lembaga Pendidikan'
                : 'Solusi Digital Bisnis';
        doc.text(typeLabel, 25, 140);

        // Divider
        doc.setDrawColor(100, 116, 139);
        doc.line(25, 155, 185, 155);

        // Client info
        doc.setFontSize(11);
        doc.setTextColor(148, 163, 184);
        doc.text('PREPARED FOR', 25, 170);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text(`${client.title}`, 25, 180);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text(`${client.company}`, 25, 188);
        doc.text(`${client.location || 'Indonesia'}`, 25, 195);

        // Date
        doc.setFontSize(10);
        doc.text(`Tanggal: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, 25, 215);

        // Footer
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text('Dokumen ini bersifat rahasia | Velora Jobs © 2026', 25, 280);


        // ═══ PAGE 2: EXECUTIVE SUMMARY & PROBLEM ANALYSIS ═══
        doc.addPage();
        let y = 25;

        // Greeting
        if (aiContent?.greeting) {
            doc.setFontSize(12);
            doc.setFont('helvetica', 'italic');
            doc.setTextColor(59, 130, 246);
            doc.text(aiContent.greeting, 20, y);
            y += 12;
        }

        // Executive Summary header
        doc.setFillColor(59, 130, 246);
        doc.rect(20, y, 4, 12, 'F');
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text('Ringkasan Eksekutif', 28, y + 9);
        y += 20;

        const summary = aiContent?.summary || `Kami di Velora Jobs berkomitmen untuk membantu ${client.company} meningkatkan skala bisnis melalui transformasi digital yang tepat sasaran.`;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        const splitSummary = doc.splitTextToSize(summary, 170);
        doc.text(splitSummary, 20, y);
        y += splitSummary.length * 5 + 10;

        // Problem Analysis
        if (aiContent?.problem_analysis) {
            doc.setFillColor(245, 158, 11);
            doc.rect(20, y, 4, 12, 'F');
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(15, 23, 42);
            doc.text('Analisis Kebutuhan', 28, y + 9);
            y += 20;

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(51, 65, 85);
            const splitProblem = doc.splitTextToSize(aiContent.problem_analysis, 170);
            doc.text(splitProblem, 20, y);
            y += splitProblem.length * 5 + 10;
        }


        // ═══ PAGE 3: PROPOSED SOLUTIONS ═══
        doc.addPage();
        y = 25;

        doc.setFillColor(16, 185, 129);
        doc.rect(20, y, 4, 12, 'F');
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text('Solusi yang Kami Tawarkan', 28, y + 9);
        y += 22;

        const offerings = aiContent?.offerings || [
            { title: 'Website Profesional', description: 'Website modern dan responsif', deliverables: ['Company profile', 'Landing page SEO', 'WhatsApp integration'] },
            { title: 'Optimasi Digital', description: 'Tingkatkan visibilitas online', deliverables: ['Google Maps listing', 'SEO on-page', 'Analytics tracking'] }
        ];

        offerings.forEach((off, idx) => {
            // Offering card
            doc.setFillColor(248, 250, 252);
            doc.roundedRect(20, y, 170, 10 + (off.deliverables.length * 6) + 12, 3, 3, 'F');

            // Offering number + title
            doc.setFillColor(59, 130, 246);
            doc.circle(28, y + 7, 3, 'F');
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(255, 255, 255);
            doc.text(`${idx + 1}`, 27, y + 9);

            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(15, 23, 42);
            doc.text(off.title, 35, y + 9);

            // Description
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 116, 139);
            doc.text(off.description, 35, y + 16);
            y += 22;

            // Deliverables
            off.deliverables.forEach((del) => {
                doc.setFillColor(16, 185, 129);
                doc.circle(30, y, 1.2, 'F');
                doc.setFontSize(9);
                doc.setTextColor(51, 65, 85);
                doc.setFont('helvetica', 'normal');
                doc.text(del, 35, y + 1);
                y += 6;
            });

            y += 8;
        });


        // ═══ PAGE 4: TIMELINE, INVESTMENT, WHY US, NEXT STEPS ═══
        doc.addPage();
        y = 25;

        // Timeline
        doc.setFillColor(139, 92, 246);
        doc.rect(20, y, 4, 12, 'F');
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text('Timeline Pengerjaan', 28, y + 9);
        y += 20;

        const timeline = aiContent?.timeline || 'Estimasi 4-8 minggu tergantung skala implementasi.';
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        const splitTimeline = doc.splitTextToSize(timeline, 170);
        doc.text(splitTimeline, 20, y);
        y += splitTimeline.length * 5 + 15;

        // Investment Strategy
        doc.setFillColor(16, 185, 129);
        doc.rect(20, y, 4, 12, 'F');
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text('Strategi Investasi', 28, y + 9);
        y += 20;

        const pricing = aiContent?.pricing_strategy || 'Investasi akhir bersifat fleksibel dan disesuaikan dengan cakupan fitur.';
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        const splitPricing = doc.splitTextToSize(pricing, 170);
        doc.text(splitPricing, 20, y);
        y += splitPricing.length * 5 + 15;

        // Why Us
        doc.setFillColor(59, 130, 246);
        doc.rect(20, y, 4, 12, 'F');
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text('Mengapa Velora Jobs?', 28, y + 9);
        y += 20;

        const whyUs = aiContent?.why_us || 'Velora Jobs menggabungkan desain premium dengan strategi digital terukur. Fokus kami adalah ROI — setiap rupiah investasi harus menghasilkan pertumbuhan nyata.';
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        const splitWhyUs = doc.splitTextToSize(whyUs, 170);
        doc.text(splitWhyUs, 20, y);
        y += splitWhyUs.length * 5 + 15;

        // Next Steps
        doc.setFillColor(245, 158, 11);
        doc.rect(20, y, 4, 12, 'F');
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text('Langkah Selanjutnya', 28, y + 9);
        y += 20;

        const nextSteps = aiContent?.next_steps || 'Hubungi kami untuk konsultasi GRATIS 30 menit.';
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        const splitNext = doc.splitTextToSize(nextSteps, 170);
        doc.text(splitNext, 20, y);

        // Footer on all pages
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(7);
            doc.setTextColor(148, 163, 184);
            doc.text(`Velora Digital Solutions — Confidential`, 20, 288);
            doc.text(`Page ${i} of ${pageCount}`, 175, 288);
        }

        const titleSlug = client.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        doc.save(`Velora_Proposal_${titleSlug}.pdf`);
        setIsGenerating(false);
    };

    const loading = !leadsData && !prospectsData;

    return (
        <div className="w-full">
            <div className="mb-12">
                <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                    <FileText className="w-8 h-8 text-emerald-500" />
                    Documents & Proposals
                </h1>
                <p className="text-muted-foreground mt-2">Generate professional PDFs for your leads (Real Data)</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Step 1: Select Client */}
                <div className="glass-panel bg-card/40 backdrop-blur-xl p-8 rounded-[2rem] border border-border/50 flex flex-col h-[650px] shadow-2xl">
                    <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-3">
                        <span className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center text-sm font-bold border border-blue-500/20">1</span>
                        Target Selection
                    </h2>

                    <div className="space-y-3 overflow-y-auto pr-2 flex-1 scrollbar-hide">
                        {loading && <div className="flex items-center justify-center py-20 text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin" /></div>}
                        {!loading && combinedClients.length === 0 && <p className="text-center py-20 text-muted-foreground">No target database found.</p>}
                        {combinedClients.map(client => (
                            <div
                                key={`${client.clientType}-${client.id}`}
                                onClick={() => {
                                    setSelectedClientId(client.id);
                                    setSelectedClientType(client.clientType);
                                    setAiContent(null); // Reset AI content when changing client
                                }}
                                className={`p-5 rounded-2xl border-2 transition-all cursor-pointer group active:scale-[0.98] ${selectedClientId === client.id && selectedClientType === client.clientType
                                    ? 'bg-blue-600/10 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.15)] text-blue-500'
                                    : 'bg-accent/10 border-border/30 hover:border-blue-500/30 text-muted-foreground hover:bg-accent/20'}`}
                            >
                                <div className="flex justify-between items-start">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-sm truncate group-hover:text-foreground transition-colors">{client.title}</span>
                                            {client.clientType === 'lead' ? <Briefcase className="w-3 h-3 opacity-50" /> : <Globe className="w-3 h-3 opacity-50" />}
                                        </div>
                                        <p className="text-[10px] opacity-70 flex items-center gap-1 font-medium"><Building2 className="w-3 h-3" /> {client.company}</p>
                                    </div>
                                    {selectedClientId === client.id && selectedClientType === client.clientType && (
                                        <CheckSquare className="w-5 h-5 text-blue-500 animate-in zoom-in-50 duration-200" />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Step 2: Generation Setup */}
                <div className={`glass-panel p-8 rounded-[2rem] border flex flex-col transition-all h-[650px] shadow-2xl ${selectedClientId ? 'bg-card/40 border-border/50 opacity-100' : 'bg-accent/5 border-dashed border-border/50 opacity-40'}`}>
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-xl font-bold text-foreground flex items-center gap-3">
                            <span className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-sm font-bold border border-emerald-500/20">2</span>
                            Proposal Engine
                        </h2>
                        {aiContent && (
                            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 text-[10px] font-bold border border-blue-500/20">
                                <Sparkles className="w-3 h-3" /> AI READY
                            </span>
                        )}
                    </div>

                    {!selectedClientId ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                            <div className="p-6 rounded-3xl bg-accent/10 border border-border/50">
                                <FilePlus className="w-12 h-12 text-muted-foreground opacity-30" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-muted-foreground">Awaiting Target</h3>
                                <p className="text-sm text-muted-foreground/60 max-w-[200px] mt-1">Select a client from the database to start the proposal engine.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col space-y-6">
                            <div className="flex-1 overflow-y-auto space-y-6 pr-2 scrollbar-hide">
                                {/* AI Action Bar */}
                                <div className="p-6 rounded-3xl bg-gradient-to-br from-blue-600/10 to-emerald-500/10 border border-blue-500/20 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-3 opacity-20"><Sparkles className="w-8 h-8 text-blue-500" /></div>
                                    <h4 className="font-bold text-blue-500 mb-2 flex items-center gap-2">
                                        Velora AI Intel
                                    </h4>
                                    <p className="text-xs text-muted-foreground mb-4">Generate specialized proposal with problem analysis, solutions & deliverables using GLM-4.</p>

                                    <button
                                        onClick={handleGenerateAiProposal}
                                        disabled={isAiLoading}
                                        className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg ${aiContent ? 'bg-blue-600/10 text-blue-500 border border-blue-500/20 hover:bg-blue-600/20' : 'bg-blue-600 text-white hover:bg-blue-500'}`}
                                    >
                                        {isAiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                        {aiContent ? 'REGENERATE DRAFT' : 'GENERATE AI DRAFT'}
                                    </button>
                                </div>

                                {aiContent && (
                                    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                        {/* Client Type Badge */}
                                        <div className="flex items-center gap-2">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${aiContent.client_type === 'islamic' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                                    aiContent.client_type === 'school' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                                        'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                                }`}>
                                                {aiContent.client_type === 'islamic' ? '🕌 Pesantren/Islami' :
                                                    aiContent.client_type === 'school' ? '🏫 Pendidikan' : '💼 Bisnis/UMKM'}
                                            </span>
                                        </div>

                                        {/* Executive Summary */}
                                        <div>
                                            <h5 className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.2em] mb-3">Executive Summary</h5>
                                            <p className="text-xs text-foreground/90 leading-relaxed italic border-l-2 border-blue-500/30 pl-4">{aiContent.summary}</p>
                                        </div>

                                        {/* Problem Analysis */}
                                        <div>
                                            <h5 className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.2em] mb-3">Analisis Kebutuhan</h5>
                                            <p className="text-xs text-foreground/90 leading-relaxed border-l-2 border-amber-500/30 pl-4">{aiContent.problem_analysis}</p>
                                        </div>

                                        {/* Offerings with Deliverables */}
                                        <div>
                                            <h5 className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.2em] mb-3">Proposed Solutions</h5>
                                            <div className="space-y-3">
                                                {aiContent.offerings.map((off, i) => (
                                                    <div key={i} className="bg-accent/10 p-3 rounded-xl border border-border/30">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
                                                            <span className="text-xs font-bold text-foreground">{off.title}</span>
                                                        </div>
                                                        <p className="text-[10px] text-muted-foreground mb-2 pl-5">{off.description}</p>
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

                                        {/* Timeline & Pricing */}
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

                            <button
                                onClick={generateProposal}
                                disabled={isGenerating}
                                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-5 rounded-3xl font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-[0_20px_40px_-15px_rgba(16,185,129,0.3)] hover:translate-y-[-2px] active:translate-y-[0]"
                            >
                                {isGenerating ? <Loader2 className="w-6 h-6 animate-spin" /> : <Download className="w-6 h-6" />}
                                EXPORT PROPOSAL PDF
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
