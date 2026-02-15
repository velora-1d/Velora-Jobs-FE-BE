'use client';

import React, { useEffect, useState, useMemo } from 'react';
import useSWR from 'swr';
import { api, fetcher, Lead } from '@/lib/api';
import {
    Loader2, ExternalLink, Database, Search, Download,
    Plus, Edit, Trash2, X
} from 'lucide-react';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Pagination } from '@/components/ui/Pagination';
import { ScoreBadge, StatusBadge, SourceBadge } from '@/components/shared/Badges';
import * as XLSX from 'xlsx';


// ─── Lead Form Modal ────────────────────────
function LeadModal({ lead, onClose, onSave }: { lead?: Lead | null, onClose: () => void, onSave: (data: Partial<Lead>) => void }) {
    const [formData, setFormData] = useState<Partial<Lead>>({
        title: '', company: '', location: '', status: 'new',
        source: 'Manual', url: '', description: ''
    });

    useEffect(() => {
        if (lead) setFormData(lead);
    }, [lead]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-card border border-border rounded-2xl w-full max-w-3xl shadow-2xl relative" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-border flex justify-between items-center">
                    <h2 className="text-xl font-bold text-foreground">{lead ? 'Edit Lead' : 'Add New Lead'}</h2>
                    <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground hover:text-foreground" /></button>
                </div>
                <form onSubmit={e => { e.preventDefault(); onSave(formData); }} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-muted-foreground uppercase tracking-widest block mb-2">Job Title / Lead Name</label>
                            <input name="title" value={formData.title} onChange={handleChange} className="w-full bg-input border border-border rounded-xl px-4 py-3 text-foreground focus:border-blue-500/50 outline-none" required />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground uppercase tracking-widest block mb-2">Company / Organization</label>
                            <input name="company" value={formData.company} onChange={handleChange} className="w-full bg-input border border-border rounded-xl px-4 py-3 text-foreground focus:border-blue-500/50 outline-none" required />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground uppercase tracking-widest block mb-2">Location</label>
                            <input name="location" value={formData.location || ''} onChange={handleChange} className="w-full bg-input border border-border rounded-xl px-4 py-3 text-foreground focus:border-blue-500/50 outline-none" />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground uppercase tracking-widest block mb-2">Application URL</label>
                            <input name="url" value={formData.url || ''} onChange={handleChange} className="w-full bg-input border border-border rounded-xl px-4 py-3 text-foreground focus:border-blue-500/50 outline-none" />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground uppercase tracking-widest block mb-2">Source</label>
                            <select name="source" value={formData.source} onChange={handleChange} className="w-full bg-input border border-border rounded-xl px-4 py-3 text-foreground focus:border-blue-500/50 outline-none">
                                <option value="Manual" className="bg-popover text-popover-foreground">Manual Input</option>
                                <option value="LinkedIn" className="bg-popover text-popover-foreground">LinkedIn</option>
                                <option value="Upwork" className="bg-popover text-popover-foreground">Upwork</option>
                                <option value="Indeed" className="bg-popover text-popover-foreground">Indeed</option>
                                <option value="Glints" className="bg-popover text-popover-foreground">Glints</option>
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
    const [editLead, setEditLead] = useState<Lead | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    // Filters
    const [filterSource, setFilterSource] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
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

    const { data: leadsData, error: leadsError, mutate: mutateLeads } = useSWR<Lead[]>(`${api.API_URL}/api/leads${queryString}`, fetcher);

    const leads = leadsData || [];
    const loading = !leadsData && !leadsError;

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

    const handleCreate = async (data: Partial<Lead>) => {
        try { await api.createLead(data); setShowCreateModal(false); mutateLeads(); } catch { alert('Failed to create lead'); }
    };

    const handleUpdate = async (data: Partial<Lead>) => {
        if (!editLead) return;
        try { await api.updateLead(editLead.id, data); setEditLead(null); mutateLeads(); } catch { alert('Failed to update lead'); }
    };

    const handleDelete = async (id: number) => { setDeleteId(id); setShowConfirm(true); };

    const executeDelete = async () => {
        if (!deleteId) return;
        try { await api.deleteLead(deleteId); setShowConfirm(false); setDeleteId(null); mutateLeads(); } catch { alert('Failed to delete lead'); }
    };

    const handleExport = () => {
        const exportData = filteredLeads.map(l => ({
            Title: l.title, Company: l.company, Location: l.location,
            Source: l.source, Score: l.match_score || '', Status: l.status,
            URL: l.url || '', Description: l.description || '',
        }));
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Leads');
        XLSX.writeFile(wb, `leads_export_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const filteredLeads = useMemo(() => {
        return leads.filter(lead => {
            const matchSource = filterSource === 'all' || lead.source === filterSource;
            const matchStatus = filterStatus === 'all' || lead.status === filterStatus;
            const matchScore = filterScore === 'all'
                || (filterScore === 'high' && (lead.match_score || 0) >= 75)
                || (filterScore === 'mid' && (lead.match_score || 0) >= 50 && (lead.match_score || 0) < 75)
                || (filterScore === 'low' && (lead.match_score || 0) < 50);
            const matchSearch = !searchQuery
                || lead.title.toLowerCase().includes(searchQuery.toLowerCase())
                || lead.company.toLowerCase().includes(searchQuery.toLowerCase())
                || lead.location.toLowerCase().includes(searchQuery.toLowerCase());
            return matchSource && matchStatus && matchScore && matchSearch;
        });
    }, [leads, filterSource, filterStatus, filterScore, searchQuery]);

    // Reset page when filters change
    useEffect(() => { setCurrentPage(1); }, [filterSource, filterStatus, filterScore, searchQuery]);

    const paginatedLeads = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredLeads.slice(start, start + pageSize);
    }, [filteredLeads, currentPage, pageSize]);

    return (
        <div className="w-full">
            <div className="mb-8 flex flex-col xl:flex-row xl:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-bold text-foreground tracking-tight flex items-center gap-3">
                        <Database className="w-8 h-8 text-emerald-500" /> Job Leads
                    </h1>
                    <p className="text-muted-foreground mt-2 text-lg">
                        {filteredLeads.length} of {leads.length} leads · {filterLabel}
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
                    {/* Source filter */}
                    <select value={filterSource} onChange={(e) => setFilterSource(e.target.value)} className="appearance-none px-4 py-3 rounded-xl text-muted-foreground text-sm bg-accent/20 border border-border focus:outline-none focus:border-blue-500/30 cursor-pointer">
                        <option value="all" className="bg-popover text-popover-foreground">All Sources</option>
                        {Array.from(new Set(leads.map(l => l.source))).map(s => <option key={s} value={s} className="bg-popover text-popover-foreground">{s}</option>)}
                    </select>
                    {/* Status filter */}
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="appearance-none px-4 py-3 rounded-xl text-muted-foreground text-sm bg-accent/20 border border-border focus:outline-none focus:border-blue-500/30 cursor-pointer">
                        <option value="all" className="bg-popover text-popover-foreground">All Status</option>
                        <option value="new" className="bg-popover text-popover-foreground">New</option>
                        <option value="contacted" className="bg-popover text-popover-foreground">Contacted</option>
                        <option value="interested" className="bg-popover text-popover-foreground">Interested</option>
                        <option value="won" className="bg-popover text-popover-foreground">Won</option>
                        <option value="rejected" className="bg-popover text-popover-foreground">Rejected</option>
                    </select>
                    {/* Score filter */}
                    <select value={filterScore} onChange={(e) => setFilterScore(e.target.value)} className="appearance-none px-4 py-3 rounded-xl text-muted-foreground text-sm bg-accent/20 border border-border focus:outline-none focus:border-blue-500/30 cursor-pointer">
                        <option value="all" className="bg-popover text-popover-foreground">All Scores</option>
                        <option value="high" className="bg-popover text-popover-foreground">High (≥75)</option>
                        <option value="mid" className="bg-popover text-popover-foreground">Mid (50–74)</option>
                        <option value="low" className="bg-popover text-popover-foreground">Low (&lt;50)</option>
                    </select>
                    <button onClick={() => setShowSearch(!showSearch)} className={`p-3 rounded-xl border transition-colors ${showSearch ? 'text-blue-500 border-blue-500/30 bg-blue-500/5' : 'text-muted-foreground hover:text-foreground border-border bg-accent/20'}`}><Search className="w-5 h-5" /></button>
                    <button onClick={handleExport} className="p-3 rounded-xl text-muted-foreground hover:text-foreground border border-border bg-accent/20 transition-colors" title="Export Excel"><Download className="w-5 h-5" /></button>
                    <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3 rounded-xl transition-all font-bold shadow-lg shadow-emerald-500/20"><Plus className="w-5 h-5" /> Add Lead</button>
                </div>
            </div>

            {showSearch && (
                <div className="mb-6 relative">
                    <Search className="w-4 h-4 text-muted-foreground absolute left-5 top-1/2 -translate-y-1/2" />
                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search title, company, location..." className="w-full bg-input border border-border rounded-xl py-3 px-12 text-foreground focus:outline-none focus:border-blue-500/30" autoFocus />
                </div>
            )}

            <div className="glass-panel rounded-3xl overflow-hidden min-h-[500px] relative flex flex-col">
                {loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground py-20"><Loader2 className="w-10 h-10 animate-spin mb-4 text-emerald-500" /><p className="font-mono text-sm tracking-widest uppercase">Loading...</p></div>
                ) : filteredLeads.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground py-20"><p className="text-lg">No leads found.</p><p className="text-sm mt-1">Use the Scraper to find job listings from LinkedIn, Upwork, etc.</p></div>
                ) : (
                    <>
                        <div className="overflow-x-auto flex-1">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-accent/20 border-b border-border text-xs font-mono text-muted-foreground uppercase tracking-widest">
                                        <th className="px-6 py-5">Job / Title</th>
                                        <th className="px-6 py-5">Score</th>
                                        <th className="px-6 py-5">Location</th>
                                        <th className="px-6 py-5">Source</th>
                                        <th className="px-6 py-5">Status</th>
                                        <th className="px-6 py-5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {paginatedLeads.map((lead) => (
                                        <tr key={lead.id} className="hover:bg-accent/10 transition-colors group">
                                            <td className="px-6 py-5">
                                                <div className="font-medium text-foreground group-hover:text-emerald-500 transition-colors max-w-[250px] truncate">{lead.title}</div>
                                                <div className="text-xs text-muted-foreground">{lead.company}</div>
                                            </td>
                                            <td className="px-6 py-5"><ScoreBadge score={lead.match_score} /></td>
                                            <td className="px-6 py-5 text-muted-foreground max-w-[120px] truncate">{lead.location}</td>
                                            <td className="px-6 py-5"><SourceBadge source={lead.source} /></td>
                                            <td className="px-6 py-5"><StatusBadge status={lead.status} /></td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => setEditLead(lead)} className="p-2 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500/20" title="Edit"><Edit className="w-4 h-4" /></button>
                                                    <button onClick={() => handleDelete(lead.id)} className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20" title="Delete"><Trash2 className="w-4 h-4" /></button>
                                                    {lead.url && <a href={lead.url} target="_blank" className="p-2 rounded-lg bg-accent/20 text-muted-foreground hover:text-foreground" title="Apply"><ExternalLink className="w-4 h-4" /></a>}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <Pagination
                            currentPage={currentPage}
                            totalItems={filteredLeads.length}
                            pageSize={pageSize}
                            onPageChange={setCurrentPage}
                            onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
                        />
                    </>
                )}
            </div>

            {showCreateModal && <LeadModal onClose={() => setShowCreateModal(false)} onSave={handleCreate} />}
            {editLead && <LeadModal lead={editLead} onClose={() => setEditLead(null)} onSave={handleUpdate} />}

            <ConfirmModal
                isOpen={showConfirm}
                title="Delete Lead"
                message="Are you sure you want to delete this lead? This will also remove all related projects, tasks, and history. This action cannot be undone."
                onConfirm={executeDelete}
                onCancel={() => { setShowConfirm(false); setDeleteId(null); }}
            />
        </div>
    );
}
