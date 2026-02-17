'use client';

import React, { useEffect, useState, useMemo } from 'react';
import useSWR from 'swr';
import { api, fetcher, FollowUp, Project, Invoice, InvoiceItem, Lead } from '@/lib/api';
import {
    Plus, Edit, Trash2, Clock, Briefcase, FileText, Download,
    Calendar, DollarSign, Phone as PhoneIcon, Mail, Users, Search,
    Loader2, CheckCircle2, ChevronDown, Building2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Pagination } from '@/components/ui/Pagination';
import { StatusBadge } from '@/components/shared/Badges';
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon';

// ═══════════════════════════════════════════════════
// ═══════════════════════════════════════════════════
// ──── FOLLOW-UP KANBAN COMPONENTS ────
// ═══════════════════════════════════════════════════

interface KanbanCardProps {
    item: FollowUp;
    onEdit: (item: FollowUp) => void;
    onDelete: (id: number) => void;
    onStatusChange: (id: number, status: string) => void;
}

function KanbanCard({ item, onEdit, onDelete, onStatusChange }: KanbanCardProps) {
    const isOverdue = item.next_follow_date && new Date(item.next_follow_date) < new Date(new Date().toISOString().split('T')[0]);

    const typeIcon = (type: string) => {
        switch (type) {
            case 'wa': return <WhatsAppIcon className="w-4 h-4 text-emerald-500" />;
            case 'call': return <PhoneIcon className="w-4 h-4 text-blue-500" />;
            case 'email': return <Mail className="w-4 h-4 text-purple-500" />;
            case 'meeting': return <Users className="w-4 h-4 text-amber-500" />;
            default: return <Clock className="w-4 h-4 text-muted-foreground" />;
        }
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`group bg-card/60 backdrop-blur-md border border-border/50 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-blue-500/30 transition-all cursor-grab active:cursor-grabbing mb-3 ${item.status === 'done' ? 'opacity-60' : ''}`}
        >
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-accent/30 border border-border/50">
                        {typeIcon(item.type)}
                    </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onEdit(item)} className="p-1.5 hover:text-blue-500 transition-colors"><Edit className="w-3.5 h-3.5" /></button>
                    <button onClick={() => onDelete(item.id)} className="p-1.5 hover:text-destructive transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
            </div>

            <h4 className="text-sm font-bold text-foreground line-clamp-1 group-hover:text-blue-500 transition-colors">{item.lead_title}</h4>
            <p className="text-[11px] text-muted-foreground mb-3">{item.lead_company}</p>

            {item.note && (
                <div className="bg-accent/20 rounded-xl p-2.5 mb-3 border border-border/30">
                    <p className="text-[11px] text-muted-foreground italic leading-relaxed line-clamp-2">"{item.note}"</p>
                </div>
            )}

            <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/30">
                <div className="flex flex-col gap-1">
                    {item.next_follow_date && (
                        <span className={`text-[9px] font-mono flex items-center gap-1 ${isOverdue && item.status === 'pending' ? 'text-rose-500 font-bold' : 'text-muted-foreground'}`}>
                            <Calendar className="w-2.5 h-2.5" /> {new Date(item.next_follow_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                        </span>
                    )}
                </div>

                <div className="flex gap-1">
                    {item.status === 'pending' && (
                        <button
                            onClick={() => onStatusChange(item.id, 'done')}
                            className="text-[9px] font-bold px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
                        >
                            DONE
                        </button>
                    )}
                    {item.status === 'pending' && (
                        <button
                            onClick={() => onStatusChange(item.id, 'skipped')}
                            className="text-[9px] font-bold px-2 py-1 rounded-lg bg-muted text-muted-foreground border border-border hover:bg-accent transition-all"
                        >
                            SKIP
                        </button>
                    )}
                    {(item.status === 'done' || item.status === 'skipped') && (
                        <button
                            onClick={() => onStatusChange(item.id, 'pending')}
                            className="text-[9px] font-bold px-2 py-1 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20 hover:bg-blue-500/20 transition-all"
                        >
                            RESET
                        </button>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

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

    const updateItemStatus = async (id: number, status: string) => {
        await api.updateFollowUp(id, { status });
        mutateItems();
    };

    const isOverdue = (date: string | null) => {
        if (!date) return false;
        return new Date(date) < new Date(new Date().toISOString().split('T')[0]);
    };

    const filteredItems = useMemo(() => {
        return items.filter(fu => {
            const matchesType = filterType === 'all' || fu.type === filterType;
            const matchesSearch = fu.note.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (leads.find(l => l.id === fu.lead_id)?.title.toLowerCase().includes(searchQuery.toLowerCase()));
            return matchesType && matchesSearch;
        });
    }, [items, filterType, searchQuery, leads]);

    const groupedItems = useMemo(() => {
        return {
            pending: filteredItems.filter((i: FollowUp) => i.status === 'pending'),
            done: filteredItems.filter((i: FollowUp) => i.status === 'done'),
            skipped: filteredItems.filter((i: FollowUp) => i.status === 'skipped'),
        };
    }, [filteredItems]);

    if (loading) return <div className="flex items-center justify-center py-20 text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mr-3" /> Loading...</div>;

    return (
        <div className="space-y-6 h-[calc(100vh-250px)] flex flex-col">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                    <select value={filterType} onChange={e => setFilterType(e.target.value)} className="appearance-none px-4 py-2.5 rounded-xl text-muted-foreground text-sm bg-accent/20 border border-border focus:outline-none focus:border-blue-500/30 cursor-pointer">
                        <option value="all" className="bg-popover">All Types</option>
                        <option value="wa" className="bg-popover">WhatsApp</option>
                        <option value="call" className="bg-popover">Phone Call</option>
                        <option value="email" className="bg-popover">Email</option>
                        <option value="meeting" className="bg-popover">Meeting</option>
                    </select>
                    <div className="relative">
                        <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search..." className="bg-input border border-border rounded-xl py-2.5 pl-10 pr-4 text-sm text-foreground focus:outline-none focus:border-blue-500/30 w-48" />
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => api.exportCSV('leads')} className="flex items-center gap-2 px-4 py-2 border border-border text-muted-foreground hover:text-foreground rounded-xl text-sm transition-all"><Download className="w-4 h-4" /> Export</button>
                    <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 rounded-xl text-sm font-bold transition-all"><Plus className="w-4 h-4" /> Add Follow-up</button>
                </div>
            </div>

            {showAdd && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={closeModal}>
                    <div className="bg-card border border-border rounded-3xl w-full max-w-lg p-8 space-y-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-foreground font-bold text-xl flex items-center gap-3">{editId ? <Edit className="w-6 h-6 text-blue-500" /> : <Plus className="w-6 h-6 text-blue-500" />} {editId ? 'Edit Follow-up' : 'New Follow-up'}</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-2 block">Lead / Client</label>
                                <select value={form.lead_id} onChange={e => setForm({ ...form, lead_id: +e.target.value })} disabled={!!editId}
                                    className="w-full bg-input border border-border rounded-xl py-4 px-4 text-foreground focus:outline-none focus:border-blue-500/50">
                                    <option value={0}>Select lead...</option>
                                    {leads.map(l => <option key={l.id} value={l.id}>{l.title} — {l.company}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-2 block">Method</label>
                                    <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                                        className="w-full bg-input border border-border rounded-xl py-4 px-4 text-foreground focus:outline-none focus:border-blue-500/50">
                                        <option value="wa">WhatsApp</option>
                                        <option value="call">Phone Call</option>
                                        <option value="email">Email</option>
                                        <option value="meeting">Meeting</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-2 block">Next Follow Up</label>
                                    <input type="date" value={form.next_follow_date} onChange={e => setForm({ ...form, next_follow_date: e.target.value })}
                                        className="w-full bg-input border border-border rounded-xl py-4 px-4 text-foreground focus:outline-none focus:border-blue-500/50" />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-2 block">Strategic Note</label>
                                <textarea value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} rows={3}
                                    className="w-full bg-input border border-border rounded-xl py-4 px-4 text-foreground focus:outline-none focus:border-blue-500/50 resize-none"
                                    placeholder="e.g. Sudah kirim penawaran, tunggu feedback..." />
                            </div>
                        </div>
                        <div className="flex gap-3 justify-end pt-4">
                            <button onClick={closeModal} className="px-6 py-3 rounded-xl border border-border text-muted-foreground hover:text-foreground transition-all font-bold text-sm">Cancel</button>
                            <button onClick={handleSave} disabled={!form.lead_id} className="px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-xl shadow-blue-500/20 disabled:opacity-40 transition-all">SAVE PROTOCOL</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex-1 flex gap-6 overflow-x-auto pb-4 scrollbar-hide min-h-0">
                <KanbanColumn
                    title="Action Required"
                    items={groupedItems.pending}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                    onStatusChange={updateItemStatus}
                    accent="bg-amber-500"
                />
                <KanbanColumn
                    title="Completed"
                    items={groupedItems.done}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                    onStatusChange={updateItemStatus}
                    accent="bg-emerald-500"
                />
                <KanbanColumn
                    title="Skipped / Hold"
                    items={groupedItems.skipped}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                    onStatusChange={updateItemStatus}
                    accent="bg-slate-500"
                />
            </div>

            <ConfirmModal
                isOpen={showConfirm}
                title="Terminate Follow-up"
                message="Are you sure you want to delete this follow-up protocol? This action cannot be undone."
                onConfirm={executeDelete}
                onCancel={() => { setShowConfirm(false); setDeleteId(null); }}
            />
        </div>
    );
}

function KanbanColumn({ title, items, onEdit, onDelete, onStatusChange, accent }: any) {
    return (
        <div className="flex-1 min-w-[320px] max-w-[400px] flex flex-col h-full bg-accent/5 border border-border/40 rounded-3xl p-4">
            <div className="flex items-center gap-3 mb-6 px-2">
                <div className={`w-1.5 h-6 rounded-full ${accent}`} />
                <h3 className="font-bold text-foreground flex items-center gap-2">
                    {title}
                    <span className="text-[10px] font-mono bg-accent/20 px-2 py-0.5 rounded-full text-muted-foreground">{items.length}</span>
                </h3>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-1 scrollbar-hide">
                <AnimatePresence mode="popLayout">
                    {items.length === 0 ? (
                        <div className="h-32 flex items-center justify-center border-2 border-dashed border-border/30 rounded-2xl opacity-40">
                            <p className="text-xs text-muted-foreground uppercase tracking-widest font-mono">Empty Zone</p>
                        </div>
                    ) : (
                        items.map((item: any) => (
                            <KanbanCard
                                key={item.id}
                                item={item}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                onStatusChange={onStatusChange}
                            />
                        ))
                    )}
                </AnimatePresence>
            </div>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                        <AnimatePresence mode="popLayout">
                            {paginatedProjects.map(p => (
                                <motion.div
                                    key={p.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="glass-panel bg-card/40 backdrop-blur-xl border border-border/40 rounded-3xl p-6 group relative hover:border-blue-500/40 transition-all overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-blue-500/10 transition-colors" />

                                    <div className="flex items-start justify-between relative z-10 mb-4">
                                        <div>
                                            <h4 className="text-foreground font-bold text-lg group-hover:text-blue-500 transition-colors">{p.name}</h4>
                                            <p className="text-muted-foreground text-xs font-medium flex items-center gap-1 mt-1">
                                                <Building2 className="w-3 h-3" /> {p.lead_company}
                                            </p>
                                        </div>
                                        <div className="relative">
                                            <select
                                                value={p.status}
                                                onChange={e => updateStatus(p.id, e.target.value)}
                                                className={`appearance-none px-4 py-1.5 rounded-xl text-[10px] font-bold border uppercase tracking-widest cursor-pointer transition-all ${statusColors[p.status] || statusColors.negotiation}`}
                                            >
                                                <option value="negotiation" className="bg-popover">Negotiation</option>
                                                <option value="active" className="bg-popover">Active</option>
                                                <option value="completed" className="bg-popover">Completed</option>
                                                <option value="cancelled" className="bg-popover">Cancelled</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-4 relative z-10">
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">Health & Progress</span>
                                                <span className="text-xs text-foreground font-bold">{p.progress}%</span>
                                            </div>
                                            <div className="w-full bg-accent/20 rounded-full h-2.5 overflow-hidden border border-border/30">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${p.progress}%` }}
                                                    transition={{ duration: 1, ease: "easeOut" }}
                                                    className={`h-full rounded-full transition-all duration-500 ${p.progress >= 75 ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : p.progress >= 30 ? 'bg-gradient-to-r from-blue-600 to-indigo-500 shadow-[0_0_10px_rgba(37,99,235,0.3)]' : 'bg-gradient-to-r from-amber-500 to-orange-400 shadow-[0_0_10px_rgba(245,158,11,0.3)]'}`}
                                                />
                                            </div>
                                            <div className="flex gap-1.5 mt-3">
                                                {[0, 25, 50, 75, 100].map(v => (
                                                    <button
                                                        key={v}
                                                        onClick={() => updateProgress(p.id, v)}
                                                        className={`text-[9px] flex-1 py-1.5 rounded-lg border transition-all font-bold ${p.progress === v ? 'bg-blue-600/20 border-blue-500/40 text-blue-500' : 'bg-accent/10 border-border/40 text-muted-foreground hover:text-foreground hover:bg-accent/20'}`}
                                                    >
                                                        {v}%
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-6 text-[10px] text-muted-foreground pt-4 border-t border-border/30 font-mono">
                                            <span className="flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5 text-emerald-500" /> {formatCurrency(p.budget)}</span>
                                            {p.deadline && (
                                                <span className={`flex items-center gap-1.5 ${new Date(p.deadline) < new Date() && p.status !== 'completed' ? 'text-rose-500 font-bold' : ''}`}>
                                                    <Calendar className="w-3.5 h-3.5" /> {new Date(p.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="absolute top-4 right-14 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 flex gap-1 bg-card/80 backdrop-blur-md p-1.5 rounded-xl border border-border shadow-xl z-20">
                                        <button onClick={() => openEdit(p)} className="p-1.5 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors"><Edit className="w-4 h-4" /></button>
                                        <button onClick={() => handleDelete(p.id)} className="p-1.5 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
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
