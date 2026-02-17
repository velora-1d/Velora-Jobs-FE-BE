'use client';

import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import { FileText, Download, FilePlus, ChevronRight, CheckSquare, Sparkles, Loader2, Globe, Building2, Briefcase } from 'lucide-react';
import { api, fetcher, Lead, Prospect } from '@/lib/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
            description: `Kategori: ${p.category} | Rating: ${p.rating || 'N/A'}`
        }))
    ].sort((a, b) => b.id - a.id);

    const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
    const [selectedClientType, setSelectedClientType] = useState<'lead' | 'prospect' | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [aiContent, setAiContent] = useState<{ summary: string, offerings: string[], pricing_strategy: string } | null>(null);

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

        // Header
        doc.setFillColor(15, 23, 42); // Slate-900 (Velora Dark)
        doc.rect(0, 0, 210, 45, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('VELORA DIGITAL SOLUTIONS', 20, 25);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Premium Software Development & Growth Management', 20, 32);

        // Client Info
        doc.setTextColor(51, 65, 85);
        doc.setFontSize(9);
        doc.text('PROPOSAL PREPARED FOR:', 20, 55);

        doc.setTextColor(15, 23, 42);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`${client.title}`, 20, 63);

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(`${client.company}`, 20, 70);
        doc.text(`${client.location || 'Indonesia'}`, 20, 75);

        doc.setTextColor(51, 65, 85);
        doc.setFontSize(9);
        doc.text('DATE:', 150, 55);
        doc.setTextColor(15, 23, 42);
        doc.text(`${new Date().toLocaleDateString('id-ID')}`, 150, 60);

        // Executive Summary
        doc.setDrawColor(226, 232, 240);
        doc.line(20, 85, 190, 85);

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Executive Summary', 20, 95);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const summary = aiContent?.summary || `Kami di Velora Jobs berkomitmen untuk membantu ${client.company} meningkatkan skala bisnis melalui transformasi digital yang tepat sasaran. Berdasarkan analisis awal kami, terdapat peluang besar untuk mengoptimalkan kehadiran digital Anda.`;
        const splitSummary = doc.splitTextToSize(summary, 170);
        doc.text(splitSummary, 20, 102);

        // Core Offerings
        const startYOfferings = 105 + (splitSummary.length * 5);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Proposed Solutions', 20, startYOfferings);

        const offerings = aiContent?.offerings || [
            'Professional Web Development (Next.js/React)',
            'Custom CRM & Management Systems',
            'Advanced SEO & Digital Branding'
        ];

        let currentY = startYOfferings + 7;
        offerings.forEach((off, idx) => {
            doc.setFillColor(59, 130, 246);
            doc.circle(23, currentY - 1, 0.8, 'F');
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(off, 28, currentY);
            currentY += 7;
        });

        // Investment Strategy
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Investment Strategy', 20, currentY + 5);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const pricing = aiContent?.pricing_strategy || 'Investasi akhir bersifat fleksibel dan akan disesuaikan dengan cakupan fitur serta jangka waktu pengerjaan.';
        const splitPricing = doc.splitTextToSize(pricing, 170);
        doc.text(splitPricing, 20, currentY + 12);

        // Footer
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text('Generated via Velora AI Engine - Confidential', 105, 285, { align: 'center' });

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
                                    <p className="text-xs text-muted-foreground mb-4">Generate specialized project breakdown & summary using GLM-4 Intelligence.</p>

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
                                        <div>
                                            <h5 className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.2em] mb-3">AI Executive Summary</h5>
                                            <p className="text-xs text-foreground/90 leading-relaxed italic border-l-2 border-blue-500/30 pl-4">{aiContent.summary}</p>
                                        </div>
                                        <div>
                                            <h5 className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.2em] mb-3">Proposed Services</h5>
                                            <ul className="space-y-2">
                                                {aiContent.offerings.map((off, i) => (
                                                    <li key={i} className="text-xs flex items-center gap-2 text-muted-foreground bg-accent/10 p-2 rounded-lg border border-border/30">
                                                        <CheckSquare className="w-3.5 h-3.5 text-emerald-500" /> {off}
                                                    </li>
                                                ))}
                                            </ul>
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
