'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Download, FilePlus, ChevronRight, CheckSquare } from 'lucide-react';
import { api, Lead } from '@/lib/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function DocumentsPage() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getLeads().then(data => {
            setLeads(data);
            setLoading(false);
        });
    }, []);

    const generateProposal = () => {
        setIsGenerating(true);
        const lead = leads.find(l => l.id === selectedLeadId);
        if (!lead) return;

        const doc = new jsPDF();

        // Header
        doc.setFillColor(30, 41, 59); // Slate-900
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.text('VELORA BUSINESS PROPOSAL', 20, 25);

        // Content
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        doc.text(`Prepared for: ${lead.title}`, 20, 60);
        doc.text(`Company: ${lead.company}`, 20, 70);
        doc.text(`Location: ${lead.location || 'Unknown'}`, 20, 80);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 90);

        doc.text('Services Offered:', 20, 110);

        autoTable(doc, {
            startY: 120,
            head: [['Service', 'Description', 'Price']],
            body: [
                ['Lead Generation', 'Access to Verified Leads Database', 'Rp 1.000.000'],
                ['WhatsApp Blaster', 'Usage of Velora WA Automation', 'Rp 500.000'],
                ['Consultation', '1-hour Strategy Session', 'Rp 750.000'],
            ],
            theme: 'grid',
            headStyles: { fillColor: [59, 130, 246] }
        });

        doc.text('Total Investment: Rp 2.250.000', 140, 190);

        const titleSlug = lead.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        doc.save(`Proposal_${titleSlug}.pdf`);
        setIsGenerating(false);
    };

    return (
        <div className="w-full">
            <div className="mb-12">
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                    <FileText className="w-8 h-8 text-emerald-400" />
                    Documents & Proposals
                </h1>
                <p className="text-slate-400 mt-2">Generate professional PDFs for your leads (Real Data)</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Step 1: Select Lead */}
                <div className="glass-panel p-6 rounded-3xl flex flex-col max-h-[600px]">
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-sm font-mono border border-blue-500/30">1</span>
                        Select Client from Database
                    </h2>
                    <div className="space-y-4 overflow-y-auto pr-2 flex-1">
                        {loading && <p className="text-slate-500">Loading leads...</p>}
                        {leads.map(lead => (
                            <div
                                key={lead.id}
                                onClick={() => setSelectedLeadId(lead.id)}
                                className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedLeadId === lead.id ? 'bg-blue-500/10 border-blue-500 text-blue-100' : 'bg-[#ffffff03] border-[#ffffff08] hover:bg-[#ffffff05] text-slate-400'}`}
                            >
                                <div className="flex justify-between items-center">
                                    <span className="font-medium truncate max-w-[200px]">{lead.title}</span>
                                    {selectedLeadId === lead.id && <CheckSquare className="w-5 h-5 text-blue-400" />}
                                </div>
                                <p className="text-xs mt-1 opacity-70 truncate">{lead.company} • {lead.location}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Step 2: Generate */}
                <div className="glass-panel p-6 rounded-3xl flex flex-col items-center justify-center text-center opacity-50 relative">
                    {!selectedLeadId && <div className="absolute inset-0 bg-black/10 z-10 cursor-not-allowed" />}
                    <div className={`transition-opacity ${selectedLeadId ? 'opacity-100' : 'opacity-30'}`}>
                        <FilePlus className="w-16 h-16 text-slate-600 mb-4 mx-auto" />
                        <h2 className="text-xl font-bold text-white mb-2">Generate Proposal</h2>
                        <p className="text-slate-500 mb-8 max-w-xs mx-auto">Create a custom proposal PDF for the selected client with standard pricing.</p>

                        <button
                            onClick={generateProposal}
                            disabled={!selectedLeadId || isGenerating}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-4 rounded-2xl font-bold text-lg flex items-center gap-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                        >
                            {isGenerating ? 'Generating...' : (
                                <>
                                    <Download className="w-6 h-6" /> Download PDF
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
