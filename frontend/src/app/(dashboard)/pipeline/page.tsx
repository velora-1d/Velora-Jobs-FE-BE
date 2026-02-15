'use client';

import React, { useEffect, useState, useMemo } from 'react';
import useSWR from 'swr';
import { api, fetcher, FollowUp, Project, Invoice, InvoiceItem, Lead } from '@/lib/api';
import {
    Plus, Edit, Trash2, Clock, Briefcase, FileText, Download,
    Calendar, DollarSign, Phone as PhoneIcon, Mail, Users, Search,
    Loader2, CheckCircle2, ChevronDown
} from 'lucide-react';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Pagination } from '@/components/ui/Pagination';

// ═══════════════════════════════════════════════════
// ──── FOLLOW-UP TAB ────
// ═══════════════════════════════════════════════════

function FollowUpTab() {
    const [showAdd, setShowAdd] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [showConfirm, setShowConfirm] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [form, setForm] = useState({ lead_id: 0, type: 'wa', note: '', next_follow_date: '' });

    // Filters
    const [filterType, setFilterType] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(15);

    // SWR
    const { data: itemsData, mutate: mutateItems } = useSWR<FollowUp[]>(`${api.API_URL}/api/followups`, fetcher);
    const { data: leadsData } = useSWR<Lead[]>(`${api.API_URL}/api/leads`, fetcher);

    const items = itemsData || [];
    const leads = leadsData || [];
    const loading = !itemsData;

    const handleSave = async () => {
        if (!form.lead_id) return;
        try {
            if (editId) {
                await api.updateFollowUp(editId, {
                    type: form.type,
                    note: form.note,
                    next_follow_date: form.next_follow_date || undefined
                });
            } else {
                await api.createFollowUp({
                    lead_id: form.lead_id,
                    type: form.type,
                    note: form.note,
                    next_follow_date: form.next_follow_date || undefined,
                });
            }
            closeModal();
            mutateItems();
        } catch (e) { alert('Failed to save'); }
    };

    const handleDelete = async (id: number) => {
        setDeleteId(id);
        setShowConfirm(true);
    };

    const executeDelete = async () => {
        if (!deleteId) return;
        try {
            await api.deleteFollowUp(deleteId);
            setShowConfirm(false);
            setDeleteId(null);
            mutateItems();
        } catch (e) { alert('Failed to delete'); }
    };

    const openEdit = (f: FollowUp) => {
        setEditId(f.id);
        setForm({
            lead_id: f.lead_id,
            type: f.type,
            note: f.note,
            next_follow_date: f.next_follow_date ? f.next_follow_date.split('T')[0] : ''
        });
        setShowAdd(true);
    };

    const closeModal = () => {
        setShowAdd(false);
        setEditId(null);
        setForm({ lead_id: 0, type: 'wa', note: '', next_follow_date: '' });
    };

    const markDone = async (id: number) => {
        await api.updateFollowUp(id, { status: 'done' });
        mutateItems();
    };

    const typeIcon = (type: string) => {
        switch (type) {
            case 'wa': return <PhoneIcon className="w-4 h-4 text-emerald-500" />;
            case 'call': return <PhoneIcon className="w-4 h-4 text-blue-500" />;
            case 'email': return <Mail className="w-4 h-4 text-purple-500" />;
            case 'meeting': return <Users className="w-4 h-4 text-amber-500" />;
            default: return <Clock className="w-4 h-4 text-muted-foreground" />;
        }
    };

    const statusColor = (s: string) => {
        if (s === 'done') return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
        if (s === 'skipped') return 'text-muted-foreground bg-muted border-border';
        return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    };

    const isOverdue = (date: string | null) => {
        if (!date) return false;
        return new Date(date) < new Date(new Date().toISOString().split('T')[0]);
    };

    const filteredItems = useMemo(() => {
        return items.filter(fu => {
            const matchType = filterType === 'all' || fu.type === filterType;
            const matchStatus = filterStatus === 'all' || fu.status === filterStatus;
            const matchSearch = !searchQuery
                || (fu.lead_title || '').toLowerCase().includes(searchQuery.toLowerCase())
                || fu.note.toLowerCase().includes(searchQuery.toLowerCase());
            return matchType && matchStatus && matchSearch;
        });
    }, [items, filterType, filterStatus, searchQuery]);

    useEffect(() => { setCurrentPage(1); }, [filterType, filterStatus, searchQuery]);

    const paginatedItems = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredItems.slice(start, start + pageSize);
    }, [filteredItems, currentPage, pageSize]);

    if (loading) return <div className="flex items-center justify-center py-20 text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mr-3" /> Loading...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                    <select value={filterType} onChange={e => setFilterType(e.target.value)} className="appearance-none px-4 py-2.5 rounded-xl text-muted-foreground text-sm bg-accent/20 border border-border focus:outline-none focus:border-blue-500/30 cursor-pointer">
                        <option value="all" className="bg-popover text-popover-foreground">All Types</option>
                        <option value="wa" className="bg-popover text-popover-foreground">WhatsApp</option>
                        <option value="call" className="bg-popover text-popover-foreground">Phone Call</option>
                        <option value="email" className="bg-popover text-popover-foreground">Email</option>
                        <option value="meeting" className="bg-popover text-popover-foreground">Meeting</option>
                    </select>
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="appearance-none px-4 py-2.5 rounded-xl text-muted-foreground text-sm bg-accent/20 border border-border focus:outline-none focus:border-blue-500/30 cursor-pointer">
                        <option value="all" className="bg-popover text-popover-foreground">All Status</option>
                        <option value="pending" className="bg-popover text-popover-foreground">Pending</option>
                        <option value="done" className="bg-popover text-popover-foreground">Done</option>
                        <option value="skipped" className="bg-popover text-popover-foreground">Skipped</option>
                    </select>
                    <div className="relative">
                        <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search..." className="bg-input border border-border rounded-xl py-2.5 pl-10 pr-4 text-sm text-foreground focus:outline-none focus:border-blue-500/30 w-48" />
                    </div>
                    <span className="text-muted-foreground text-xs font-mono">{filteredItems.length} results</span>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => api.exportCSV('leads')} className="flex items-center gap-2 px-4 py-2 border border-border text-muted-foreground hover:text-foreground rounded-xl text-sm transition-all"><Download className="w-4 h-4" /> Export</button>
                    <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-sm font-bold transition-all"><Plus className="w-4 h-4" /> Add Follow-up</button>
                </div>
            </div>

            {showAdd && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={closeModal}>
                    <div className="bg-popover border border-border rounded-2xl w-full max-w-lg p-6 space-y-5" onClick={e => e.stopPropagation()}>
                        <h3 className="text-popover-foreground font-bold text-lg flex items-center gap-2">{editId ? <Edit className="w-5 h-5 text-primary" /> : <Plus className="w-5 h-5 text-primary" />} {editId ? 'Edit Follow-up' : 'New Follow-up'}</h3>
                        <div>
                            <label className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2 block">Lead</label>
                            <select value={form.lead_id} onChange={e => setForm({ ...form, lead_id: +e.target.value })} disabled={!!editId}
                                className="w-full bg-input border border-border rounded-xl py-3 px-4 text-foreground focus:outline-none focus:border-primary/50">
                                <option value={0} className="bg-popover">Select lead...</option>
                                {leads.map(l => <option key={l.id} value={l.id} className="bg-popover">{l.title} — {l.company}</option>)}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2 block">Type</label>
                                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                                    className="w-full bg-input border border-border rounded-xl py-3 px-4 text-foreground focus:outline-none focus:border-primary/50">
                                    <option value="wa" className="bg-popover">WhatsApp</option>
                                    <option value="call" className="bg-popover">Phone Call</option>
                                    <option value="email" className="bg-popover">Email</option>
                                    <option value="meeting" className="bg-popover">Meeting</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2 block">Next Follow Date</label>
                                <input type="date" value={form.next_follow_date} onChange={e => setForm({ ...form, next_follow_date: e.target.value })}
                                    className="w-full bg-input border border-border rounded-xl py-3 px-4 text-foreground focus:outline-none focus:border-primary/50" />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2 block">Note</label>
                            <textarea value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} rows={3}
                                className="w-full bg-input border border-border rounded-xl py-3 px-4 text-foreground focus:outline-none focus:border-primary/50 resize-none"
                                placeholder="e.g. Sudah kirim WA pertama, tunggu respon..." />
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button onClick={closeModal} className="px-5 py-2.5 rounded-xl border border-border text-muted-foreground hover:text-foreground transition-all text-sm">Cancel</button>
                            <button onClick={handleSave} disabled={!form.lead_id} className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm disabled:opacity-40 transition-all">Save</button>
                        </div>
                    </div>
                </div>
            )}

            {filteredItems.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground"><Clock className="w-12 h-12 mx-auto mb-4 opacity-30" /><p className="text-lg">No follow-ups found.</p></div>
            ) : (
                <>
                    <div className="space-y-3">
                        {paginatedItems.map(fu => (
                            <div key={fu.id} className={`glass-panel bg-card border border-border rounded-2xl p-5 flex items-start gap-4 group transition-all ${fu.status === 'done' ? 'opacity-60' : ''}`}>
                                <div className="p-2 rounded-xl bg-accent border border-border">{typeIcon(fu.type)}</div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-foreground font-medium text-sm">{fu.lead_title}</span>
                                        <span className="text-muted-foreground text-xs">·</span>
                                        <span className="text-muted-foreground text-xs">{fu.lead_company}</span>
                                    </div>
                                    {fu.note && <p className="text-muted-foreground text-xs mt-1 line-clamp-2">{fu.note}</p>}
                                    <div className="flex items-center gap-3 mt-2">
                                        {fu.next_follow_date && (
                                            <span className={`text-[10px] font-mono flex items-center gap-1 ${isOverdue(fu.next_follow_date) && fu.status === 'pending' ? 'text-destructive' : 'text-muted-foreground'}`}>
                                                <Calendar className="w-3 h-3" /> {fu.next_follow_date}
                                                {isOverdue(fu.next_follow_date) && fu.status === 'pending' && <span className="text-destructive font-bold ml-1">OVERDUE</span>}
                                            </span>
                                        )}
                                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-widest ${statusColor(fu.status)}`}>{fu.status}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openEdit(fu)} className="p-2 text-muted-foreground hover:text-blue-500"><Edit className="w-4 h-4" /></button>
                                    <button onClick={() => handleDelete(fu.id)} className="p-2 text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                                    {fu.status === 'pending' && (
                                        <button onClick={() => markDone(fu.id)} className="p-2 text-muted-foreground hover:text-emerald-500"><CheckCircle2 className="w-5 h-5" /></button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    <Pagination
                        currentPage={currentPage}
                        totalItems={filteredItems.length}
                        pageSize={pageSize}
                        onPageChange={setCurrentPage}
                        onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
                    />
                </>
            )}

            <ConfirmModal
                isOpen={showConfirm}
                title="Delete Follow-up"
                message="Are you sure you want to delete this follow-up? This action cannot be undone."
                onConfirm={executeDelete}
                onCancel={() => {
                    setShowConfirm(false);
                    setDeleteId(null);
                }}
            />
        </div>
    );
}

// ═══════════════════════════════════════════════════
// ──── PROJECTS TAB ────
// ═══════════════════════════════════════════════════

function ProjectsTab() {
    const [showAdd, setShowAdd] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [showConfirm, setShowConfirm] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [form, setForm] = useState({ lead_id: 0, name: '', description: '', budget: '', deadline: '' });

    // Filters
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(15);

    // SWR
    const { data: projectsData, mutate: mutateProjects } = useSWR<Project[]>(`${api.API_URL}/api/projects`, fetcher);
    const { data: leadsData } = useSWR<Lead[]>(`${api.API_URL}/api/leads`, fetcher);

    const projects = projectsData || [];
    const leads = leadsData || [];
    const loading = !projectsData;

    const handleSave = async () => {
        if (!form.lead_id || !form.name) return;
        try {
            if (editId) {
                await api.updateProject(editId, {
                    name: form.name,
                    description: form.description,
                    budget: form.budget ? parseFloat(form.budget) : 0,
                    deadline: form.deadline || undefined,
                });
            } else {
                await api.createProject({
                    lead_id: form.lead_id,
                    name: form.name,
                    description: form.description,
                    budget: form.budget ? parseFloat(form.budget) : undefined,
                    deadline: form.deadline || undefined,
                });
            }
            closeModal();
            mutateProjects();
        } catch (e) { alert('Failed to save'); }
    };

    const handleDelete = async (id: number) => {
        setDeleteId(id);
        setShowConfirm(true);
    };

    const executeDelete = async () => {
        if (!deleteId) return;
        try {
            await api.deleteProject(deleteId);
            setShowConfirm(false);
            setDeleteId(null);
            mutateProjects();
        } catch (e) { alert('Failed to delete'); }
    };

    const openEdit = (p: Project) => {
        setEditId(p.id);
        setForm({
            lead_id: p.lead_id,
            name: p.name,
            description: p.description,
            budget: p.budget ? p.budget.toString() : '',
            deadline: p.deadline ? p.deadline.split('T')[0] : ''
        });
        setShowAdd(true);
    };

    const closeModal = () => {
        setShowAdd(false);
        setEditId(null);
        setForm({ lead_id: 0, name: '', description: '', budget: '', deadline: '' });
    };

    const updateProgress = async (id: number, progress: number) => {
        await api.updateProject(id, { progress: Math.min(100, Math.max(0, progress)) });
        mutateProjects();
    };

    const updateStatus = async (id: number, status: string) => {
        await api.updateProject(id, { status });
        mutateProjects();
    };

    const statusColors: Record<string, string> = {
        negotiation: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
        active: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
        completed: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
        cancelled: 'text-destructive bg-destructive/10 border-destructive/20',
    };

    const formatCurrency = (n: number | null) => n != null ? `Rp ${n.toLocaleString('id-ID')}` : '-';

    const filteredProjects = useMemo(() => {
        return projects.filter(p => {
            const matchStatus = filterStatus === 'all' || p.status === filterStatus;
            const matchSearch = !searchQuery
                || p.name.toLowerCase().includes(searchQuery.toLowerCase())
                || (p.lead_company || '').toLowerCase().includes(searchQuery.toLowerCase());
            return matchStatus && matchSearch;
        });
    }, [projects, filterStatus, searchQuery]);

    useEffect(() => { setCurrentPage(1); }, [filterStatus, searchQuery]);

    const paginatedProjects = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredProjects.slice(start, start + pageSize);
    }, [filteredProjects, currentPage, pageSize]);

    if (loading) return <div className="flex items-center justify-center py-20 text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mr-3" /> Loading...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="appearance-none px-4 py-2.5 rounded-xl text-muted-foreground text-sm bg-accent/20 border border-border focus:outline-none focus:border-blue-500/30 cursor-pointer">
                        <option value="all" className="bg-popover text-popover-foreground">All Status</option>
                        <option value="negotiation" className="bg-popover text-popover-foreground">Negotiation</option>
                        <option value="active" className="bg-popover text-popover-foreground">Active</option>
                        <option value="completed" className="bg-popover text-popover-foreground">Completed</option>
                        <option value="cancelled" className="bg-popover text-popover-foreground">Cancelled</option>
                    </select>
                    <div className="relative">
                        <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search projects..." className="bg-input border border-border rounded-xl py-2.5 pl-10 pr-4 text-sm text-foreground focus:outline-none focus:border-blue-500/30 w-48" />
                    </div>
                    <span className="text-muted-foreground text-xs font-mono">{filteredProjects.length} projects</span>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => api.exportCSV('projects')} className="flex items-center gap-2 px-4 py-2 border border-border text-muted-foreground hover:text-foreground rounded-xl text-sm transition-all"><Download className="w-4 h-4" /> Export</button>
                    <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-sm font-bold transition-all"><Plus className="w-4 h-4" /> New Project</button>
                </div>
            </div>

            {showAdd && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={closeModal}>
                    <div className="bg-popover border border-border rounded-2xl w-full max-w-lg p-6 space-y-5" onClick={e => e.stopPropagation()}>
                        <h3 className="text-popover-foreground font-bold text-lg flex items-center gap-2">{editId ? <Edit className="w-5 h-5 text-primary" /> : <Briefcase className="w-5 h-5 text-primary" />} {editId ? 'Edit Project' : 'New Project'}</h3>
                        <div>
                            <label className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2 block">Lead / Client</label>
                            <select value={form.lead_id} onChange={e => setForm({ ...form, lead_id: +e.target.value })} disabled={!!editId}
                                className="w-full bg-input border border-border rounded-xl py-3 px-4 text-foreground focus:outline-none focus:border-primary/50">
                                <option value={0} className="bg-popover">Select lead...</option>
                                {leads.map(l => <option key={l.id} value={l.id} className="bg-popover">{l.title} — {l.company}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2 block">Project Name</label>
                            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                                className="w-full bg-input border border-border rounded-xl py-3 px-4 text-foreground focus:outline-none focus:border-primary/50"
                                placeholder="e.g. Website Pesantren Al-Ihsan" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2 block">Budget (Rp)</label>
                                <input type="number" value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })}
                                    className="w-full bg-input border border-border rounded-xl py-3 px-4 text-foreground focus:outline-none focus:border-primary/50" />
                            </div>
                            <div>
                                <label className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2 block">Deadline</label>
                                <input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })}
                                    className="w-full bg-input border border-border rounded-xl py-3 px-4 text-foreground focus:outline-none focus:border-primary/50" />
                            </div>
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button onClick={closeModal} className="px-5 py-2.5 rounded-xl border border-border text-muted-foreground hover:text-foreground transition-all text-sm">Cancel</button>
                            <button onClick={handleSave} disabled={!form.lead_id || !form.name} className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm disabled:opacity-40 transition-all">Save</button>
                        </div>
                    </div>
                </div>
            )}

            {filteredProjects.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground"><Briefcase className="w-12 h-12 mx-auto mb-4 opacity-30" /><p className="text-lg">No projects found.</p></div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {paginatedProjects.map(p => (
                            <div key={p.id} className="glass-panel bg-card border border-border rounded-2xl p-6 space-y-4 group relative">
                                <div className="flex items-start justify-between">
                                    <div><h4 className="text-foreground font-bold">{p.name}</h4><p className="text-muted-foreground text-xs mt-0.5">{p.lead_company}</p></div>
                                    <div className="relative">
                                        <select value={p.status} onChange={e => updateStatus(p.id, e.target.value)}
                                            className={`appearance-none px-3 py-1 rounded-lg text-[10px] font-bold border uppercase tracking-widest cursor-pointer ${statusColors[p.status] || statusColors.negotiation}`}>
                                            <option value="negotiation" className="bg-popover">Negotiation</option>
                                            <option value="active" className="bg-popover">Active</option>
                                            <option value="completed" className="bg-popover">Completed</option>
                                            <option value="cancelled" className="bg-popover">Cancelled</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs text-muted-foreground font-mono">Progress</span>
                                        <span className="text-xs text-foreground font-bold">{p.progress}%</span>
                                    </div>
                                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                                        <div className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full rounded-full transition-all duration-500" style={{ width: `${p.progress}%` }} />
                                    </div>
                                    <div className="flex gap-2 mt-2">
                                        {[0, 25, 50, 75, 100].map(v => (
                                            <button key={v} onClick={() => updateProgress(p.id, v)} className={`text-[9px] px-2 py-1 rounded border transition-all ${p.progress === v ? 'bg-primary/20 border-primary/40 text-primary' : 'bg-muted border-border text-muted-foreground hover:text-foreground'}`}>{v}%</button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t border-border">
                                    <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> {formatCurrency(p.budget)}</span>
                                    {p.deadline && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {p.deadline}</span>}
                                    <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {p.invoice_count} inv</span>
                                </div>
                                <div className="absolute top-4 right-12 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-popover p-1 rounded-lg border border-border">
                                    <button onClick={() => openEdit(p)} className="p-1 hover:text-blue-500"><Edit className="w-4 h-4" /></button>
                                    <button onClick={() => handleDelete(p.id)} className="p-1 hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <Pagination
                        currentPage={currentPage}
                        totalItems={filteredProjects.length}
                        pageSize={pageSize}
                        onPageChange={setCurrentPage}
                        onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
                    />
                </>
            )}

            <ConfirmModal
                isOpen={showConfirm}
                title="Delete Project"
                message="Are you sure you want to delete this project? This will also remove related invoices and history. This action cannot be undone."
                onConfirm={executeDelete}
                onCancel={() => {
                    setShowConfirm(false);
                    setDeleteId(null);
                }}
            />
        </div>
    );
}

// ═══════════════════════════════════════════════════
// ──── INVOICES TAB ────
// ═══════════════════════════════════════════════════

function InvoicesTab() {
    const [showAdd, setShowAdd] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [showConfirm, setShowConfirm] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [form, setForm] = useState({ project_id: 0, items: [{ desc: '', qty: 1, price: 0 }] as InvoiceItem[], tax_percent: 0, due_date: '', notes: '' });

    // Filters
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(15);

    // SWR
    const { data: invoicesData, mutate: mutateInvoices } = useSWR<Invoice[]>(`${api.API_URL}/api/invoices`, fetcher);
    const { data: projectsData } = useSWR<Project[]>(`${api.API_URL}/api/projects`, fetcher);

    const invoices = invoicesData || [];
    const projects = projectsData || [];
    const loading = !invoicesData;

    const addItem = () => setForm({ ...form, items: [...form.items, { desc: '', qty: 1, price: 0 }] });
    const removeItem = (i: number) => setForm({ ...form, items: form.items.filter((_, idx) => idx !== i) });
    const updateItem = (i: number, field: keyof InvoiceItem, value: string | number) => {
        const items = [...form.items];
        (items[i] as any)[field] = value;
        setForm({ ...form, items });
    };

    const subtotal = form.items.reduce((sum, item) => sum + item.qty * item.price, 0);
    const total = subtotal + (subtotal * form.tax_percent / 100);

    const handleSave = async () => {
        if (!form.project_id || form.items.length === 0) return;
        try {
            if (editId) {
                await api.updateInvoice(editId, {
                    status: 'draft',
                    items: form.items,
                    tax_percent: form.tax_percent,
                    due_date: form.due_date || undefined,
                    notes: form.notes || undefined
                });
            } else {
                await api.createInvoice({
                    project_id: form.project_id,
                    items: form.items,
                    tax_percent: form.tax_percent,
                    due_date: form.due_date || undefined,
                    notes: form.notes || undefined,
                });
            }
            closeModal();
            mutateInvoices();
        } catch (e) { alert('Failed to save invoice'); }
    };

    const handleDelete = async (id: number) => {
        setDeleteId(id);
        setShowConfirm(true);
    };

    const executeDelete = async () => {
        if (!deleteId) return;
        try {
            await api.deleteInvoice(deleteId);
            setShowConfirm(false);
            setDeleteId(null);
            mutateInvoices();
        } catch (e) { alert('Failed to delete'); }
    };

    const openEdit = (inv: Invoice) => {
        setEditId(inv.id);
        const parsedItems = typeof inv.items === 'string' ? JSON.parse(inv.items) : inv.items;
        setForm({
            project_id: inv.project_id,
            items: parsedItems || [],
            tax_percent: inv.tax_percent || 0,
            due_date: inv.due_date ? inv.due_date.split('T')[0] : '',
            notes: inv.notes
        });
        setShowAdd(true);
    };

    const closeModal = () => {
        setShowAdd(false);
        setEditId(null);
        setForm({ project_id: 0, items: [{ desc: '', qty: 1, price: 0 }], tax_percent: 0, due_date: '', notes: '' });
    };

    const updateStatus = async (id: number, status: string) => {
        await api.updateInvoice(id, { status });
        mutateInvoices();
    };

    const statusColors: Record<string, string> = {
        draft: 'text-muted-foreground bg-muted border-border',
        sent: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
        paid: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
        overdue: 'text-destructive bg-destructive/10 border-destructive/20',
    };

    const formatCurrency = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

    const filteredInvoices = useMemo(() => {
        return invoices.filter(inv => {
            const matchStatus = filterStatus === 'all' || inv.status === filterStatus;
            const matchSearch = !searchQuery
                || (inv.invoice_number || '').toLowerCase().includes(searchQuery.toLowerCase())
                || (inv.project_name || '').toLowerCase().includes(searchQuery.toLowerCase())
                || (inv.client_name || '').toLowerCase().includes(searchQuery.toLowerCase());
            return matchStatus && matchSearch;
        });
    }, [invoices, filterStatus, searchQuery]);

    useEffect(() => { setCurrentPage(1); }, [filterStatus, searchQuery]);

    const paginatedInvoices = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredInvoices.slice(start, start + pageSize);
    }, [filteredInvoices, currentPage, pageSize]);

    if (loading) return <div className="flex items-center justify-center py-20 text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mr-3" /> Loading...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="appearance-none px-4 py-2.5 rounded-xl text-muted-foreground text-sm bg-accent/20 border border-border focus:outline-none focus:border-blue-500/30 cursor-pointer">
                        <option value="all" className="bg-popover text-popover-foreground">All Status</option>
                        <option value="draft" className="bg-popover text-popover-foreground">Draft</option>
                        <option value="sent" className="bg-popover text-popover-foreground">Sent</option>
                        <option value="paid" className="bg-popover text-popover-foreground">Paid</option>
                        <option value="overdue" className="bg-popover text-popover-foreground">Overdue</option>
                    </select>
                    <div className="relative">
                        <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search invoices..." className="bg-input border border-border rounded-xl py-2.5 pl-10 pr-4 text-sm text-foreground focus:outline-none focus:border-blue-500/30 w-48" />
                    </div>
                    <span className="text-muted-foreground text-xs font-mono">{filteredInvoices.length} invoices · {formatCurrency(filteredInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0))} paid</span>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => api.exportCSV('invoices')} className="flex items-center gap-2 px-4 py-2 border border-border text-muted-foreground hover:text-foreground rounded-xl text-sm transition-all"><Download className="w-4 h-4" /> Export</button>
                    <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-sm font-bold transition-all"><Plus className="w-4 h-4" /> New Invoice</button>
                </div>
            </div>

            {showAdd && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={closeModal}>
                    <div className="bg-popover border border-border rounded-2xl w-full max-w-2xl p-6 space-y-5 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <h3 className="text-popover-foreground font-bold text-lg flex items-center gap-2">{editId ? <Edit className="w-5 h-5 text-primary" /> : <FileText className="w-5 h-5 text-primary" />} {editId ? 'Edit Invoice' : 'New Invoice'}</h3>
                        <div>
                            <label className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2 block">Project</label>
                            <select value={form.project_id} onChange={e => setForm({ ...form, project_id: +e.target.value })} disabled={!!editId}
                                className="w-full bg-input border border-border rounded-xl py-3 px-4 text-foreground focus:outline-none focus:border-primary/50">
                                <option value={0} className="bg-popover">Select project...</option>
                                {projects.map(p => <option key={p.id} value={p.id} className="bg-popover">{p.name} — {p.lead_company}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-3 block">Line Items</label>
                            <div className="space-y-2">
                                {form.items.map((item, i) => (
                                    <div key={i} className="flex gap-2 items-center">
                                        <input type="text" value={item.desc} onChange={e => updateItem(i, 'desc', e.target.value)} className="flex-1 bg-input border border-border rounded-lg py-2 px-3 text-sm text-foreground focus:outline-none focus:border-primary/50" placeholder="Description" />
                                        <input type="number" value={item.qty} onChange={e => updateItem(i, 'qty', +e.target.value)} className="w-16 bg-input border border-border rounded-lg py-2 px-3 text-sm text-foreground focus:outline-none focus:border-primary/50 text-center" min={1} />
                                        <input type="number" value={item.price} onChange={e => updateItem(i, 'price', +e.target.value)} className="w-32 bg-input border border-border rounded-lg py-2 px-3 text-sm text-foreground focus:outline-none focus:border-primary/50" placeholder="Price" />
                                        <button onClick={() => removeItem(i)} className="p-2 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                ))}
                            </div>
                            <button onClick={addItem} className="mt-3 text-xs text-primary hover:text-primary/80 flex items-center gap-1"><Plus className="w-3 h-3" /> Add item</button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2 block">Tax (%)</label><input type="number" value={form.tax_percent} onChange={e => setForm({ ...form, tax_percent: +e.target.value })} className="w-full bg-input border border-border rounded-xl py-3 px-4 text-foreground focus:outline-none focus:border-primary/50" /></div>
                            <div><label className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2 block">Due Date</label><input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} className="w-full bg-input border border-border rounded-xl py-3 px-4 text-foreground focus:outline-none focus:border-primary/50" /></div>
                        </div>
                        <div className="bg-accent/50 rounded-xl p-4 border border-border space-y-2 text-sm">
                            <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span className="font-mono">{formatCurrency(subtotal)}</span></div>
                            <div className="flex justify-between text-muted-foreground"><span>Tax ({form.tax_percent}%)</span><span className="font-mono">{formatCurrency(subtotal * form.tax_percent / 100)}</span></div>
                            <div className="flex justify-between text-foreground font-bold border-t border-border pt-2"><span>Total</span><span className="font-mono text-lg">{formatCurrency(total)}</span></div>
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button onClick={closeModal} className="px-5 py-2.5 rounded-xl border border-border text-muted-foreground hover:text-foreground transition-all text-sm">Cancel</button>
                            <button onClick={handleSave} disabled={!form.project_id} className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm disabled:opacity-40 transition-all">Save Invoice</button>
                        </div>
                    </div>
                </div>
            )}

            {filteredInvoices.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground"><FileText className="w-12 h-12 mx-auto mb-4 opacity-30" /><p className="text-lg">No invoices found.</p></div>
            ) : (
                <>
                    <div className="overflow-x-auto glass-panel bg-card border border-border rounded-2xl">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-border text-xs font-mono text-muted-foreground uppercase tracking-widest">
                                    <th className="px-6 py-4">Invoice</th>
                                    <th className="px-6 py-4">Client</th>
                                    <th className="px-6 py-4">Project</th>
                                    <th className="px-6 py-4">Total</th>
                                    <th className="px-6 py-4">Due</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {paginatedInvoices.map(inv => (
                                    <tr key={inv.id} className="hover:bg-accent/50 transition-colors group">
                                        <td className="px-6 py-4 text-foreground font-mono text-sm font-bold">{inv.invoice_number}</td>
                                        <td className="px-6 py-4 text-muted-foreground text-sm">{inv.client_name}</td>
                                        <td className="px-6 py-4 text-muted-foreground text-sm">{inv.project_name}</td>
                                        <td className="px-6 py-4 text-foreground font-mono text-sm">{formatCurrency(inv.total)}</td>
                                        <td className="px-6 py-4 text-muted-foreground text-xs font-mono">{inv.due_date || '-'}</td>
                                        <td className="px-6 py-4">
                                            <select value={inv.status} onChange={e => updateStatus(inv.id, e.target.value)} className={`appearance-none px-3 py-1 rounded-lg text-[10px] font-bold border uppercase tracking-widest cursor-pointer bg-transparent ${statusColors[inv.status] || statusColors.draft}`}>
                                                <option value="draft" className="bg-popover">Draft</option>
                                                <option value="sent" className="bg-popover">Sent</option>
                                                <option value="paid" className="bg-popover">Paid</option>
                                                <option value="overdue" className="bg-popover">Overdue</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => openEdit(inv)} className="p-2 text-muted-foreground hover:text-blue-500"><Edit className="w-4 h-4" /></button>
                                                <button onClick={() => handleDelete(inv.id)} className="p-2 text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                                                <button onClick={() => window.open(`${api.API_URL}/api/invoices/${inv.id}/download`, '_blank')} className="p-2 text-muted-foreground hover:text-emerald-500"><Download className="w-4 h-4" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <Pagination
                        currentPage={currentPage}
                        totalItems={filteredInvoices.length}
                        pageSize={pageSize}
                        onPageChange={setCurrentPage}
                        onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
                    />
                </>
            )}

            <ConfirmModal
                isOpen={showConfirm}
                title="Delete Invoice"
                message="Are you sure you want to delete this invoice? This action cannot be undone."
                onConfirm={executeDelete}
                onCancel={() => {
                    setShowConfirm(false);
                    setDeleteId(null);
                }}
            />
        </div>
    );
}

// ═══════════════════════════════════════════════════
// ──── MAIN PIPELINE PAGE ────
// ═══════════════════════════════════════════════════

const TABS = [
    { id: 'followup', label: 'Follow-up', Icon: Clock },
    { id: 'projects', label: 'Projects', Icon: Briefcase },
    { id: 'invoices', label: 'Invoices', Icon: FileText },
];

export default function PipelinePage() {
    const [tab, setTab] = useState('followup');

    return (
        <div className="w-full">
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-foreground tracking-tight flex items-center gap-3">
                    <Briefcase className="w-8 h-8 text-primary" /> Pipeline
                </h1>
                <p className="text-muted-foreground mt-2 text-lg">Manage your follow-ups, projects, and invoices</p>
            </div>

            <div className="bg-accent/20 p-1 rounded-2xl border border-border flex items-center mb-8 w-fit">
                {TABS.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all ${tab === t.id ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}>
                        <t.Icon className="w-4 h-4" /> {t.label}
                    </button>
                ))}
            </div>

            {tab === 'followup' && <FollowUpTab />}
            {tab === 'projects' && <ProjectsTab />}
            {tab === 'invoices' && <InvoicesTab />}
        </div>
    );
}
