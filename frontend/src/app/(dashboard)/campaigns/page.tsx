'use client';

import React, { useState, useMemo, useRef } from 'react';
import useSWR from 'swr';
import {
    Send, Users, Zap, Plus, X, Edit, Trash2, Calendar, Play, Pause,
    Search, FileText, Copy, Tag, Rocket, BarChart2, Eye, TrendingUp,
    CheckCircle2, AlertCircle, Sparkles
} from 'lucide-react';
import { api, fetcher, Campaign, PromotionTemplate } from '@/lib/api';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { StatusBadge } from '@/components/shared/Badges';
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon';
import AITemplateGenerator from '@/components/analytics/AITemplateGenerator';

// ─── Variable Picker ────────────────────────
const AVAILABLE_VARS = [
    { key: '{name}', label: 'Name', desc: 'Contact/business name' },
    { key: '{company}', label: 'Company', desc: 'Company/org name' },
    { key: '{phone}', label: 'Phone', desc: 'Phone number' },
    { key: '{email}', label: 'Email', desc: 'Email address' },
    { key: '{category}', label: 'Category', desc: 'Business category' },
];

function VariablePicker({ onInsert }: { onInsert: (v: string) => void }) {
    return (
        <div className="flex flex-wrap gap-1.5 mt-2">
            {AVAILABLE_VARS.map(v => (
                <button key={v.key} type="button" onClick={() => onInsert(v.key)}
                    className="px-2 py-1 bg-primary/10 text-primary border border-primary/20 rounded text-[10px] font-mono hover:bg-primary/20 transition-all"
                    title={v.desc}>
                    {v.key}
                </button>
            ))}
        </div>
    );
}

// ─── Stats Card ────────────────────────
function StatCard({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: any; color: string }) {
    return (
        <div className={`p-4 rounded-2xl border bg-card flex items-center gap-4 ${color}`}>
            <div className={`p-2.5 rounded-xl bg-current/10`}>
                <Icon className="w-5 h-5" />
            </div>
            <div>
                <p className="text-2xl font-bold text-foreground">{value}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{label}</p>
            </div>
        </div>
    );
}

// ─── Template Card ────────────────────────
function TemplateCard({ t, onEdit, onDelete, onUse }: {
    t: PromotionTemplate; onEdit: () => void; onDelete: () => void; onUse: () => void
}) {
    const categoryColors: Record<string, string> = {
        pesantren: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
        sekolah: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
        umkm: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
        general: 'bg-muted/30 text-muted-foreground border-border',
    };
    const varCount = (t.content.match(/\{(\w+)\}/g) || []).length;
    const charCount = t.content.length;

    return (
        <div className="p-5 bg-muted/30 border border-border rounded-2xl hover:border-primary/30 transition-all group">
            <div className="flex justify-between items-start mb-3">
                <div>
                    <h4 className="font-bold text-foreground text-sm">{t.title}</h4>
                    <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-widest border ${categoryColors[t.category] || categoryColors.general}`}>
                            {t.category}
                        </span>
                        <span className="text-[9px] text-muted-foreground font-mono">{charCount} chars</span>
                        {varCount > 0 && (
                            <span className="text-[9px] bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded font-mono">{varCount} vars</span>
                        )}
                    </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={onUse} className="p-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-all" title="Use in Campaign">
                        <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={onEdit} className="p-1.5 bg-blue-500/10 text-blue-500 rounded-lg hover:bg-blue-500/20 transition-all" title="Edit">
                        <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={onDelete} className="p-1.5 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-all" title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
            <p className="text-xs text-muted-foreground font-mono whitespace-pre-line line-clamp-3">{t.content}</p>
        </div>
    );
}

// ─── Campaign Card ────────────────────────
function CampaignCard({ c, isSelected, onClick, onLaunch, onEdit, onDelete }: {
    c: Campaign; isSelected: boolean; onClick: () => void;
    onLaunch: () => void; onEdit: () => void; onDelete: () => void;
}) {
    const total = (c.sent_count || 0) + (c.failed_count || 0);
    const rate = total > 0 ? Math.round(((c.sent_count || 0) / total) * 100) : 0;

    return (
        <div
            onClick={onClick}
            className={`p-4 rounded-2xl border transition-all cursor-pointer group relative ${isSelected ? 'bg-primary/10 border-primary/50 shadow-lg shadow-primary/10' : 'bg-muted/20 border-border hover:border-primary/30 hover:bg-muted/30'}`}
        >
            <div className="flex justify-between items-start mb-3">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`text-sm font-bold truncate ${isSelected ? 'text-primary' : 'text-foreground'}`}>{c.name}</span>
                        {c.smart_ai && (
                            <span className="text-[8px] font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shrink-0">
                                <Sparkles className="w-2 h-2" /> AI
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <StatusBadge status={c.status} />
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Users className="w-3 h-3" /> {c.target_type || 'leads'}
                        </span>
                    </div>
                </div>
                {/* Quick Launch */}
                <button
                    onClick={e => { e.stopPropagation(); onLaunch(); }}
                    className="opacity-0 group-hover:opacity-100 p-2 bg-[#25D366] text-white rounded-xl hover:bg-[#20ba59] transition-all shadow-lg shadow-emerald-500/20 shrink-0"
                    title="Launch"
                >
                    <WhatsAppIcon className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                <span className="flex items-center gap-1 text-emerald-500 font-mono font-bold">
                    <CheckCircle2 className="w-3 h-3" /> {c.sent_count || 0}
                </span>
                <span className="flex items-center gap-1 text-destructive font-mono">
                    <AlertCircle className="w-3 h-3" /> {c.failed_count || 0}
                </span>
                {c.scheduled_at && (
                    <span className="flex items-center gap-1 ml-auto">
                        <Calendar className="w-3 h-3" /> {new Date(c.scheduled_at).toLocaleDateString('id-ID')}
                    </span>
                )}
            </div>

            {/* Progress bar */}
            {total > 0 && (
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all"
                        style={{ width: `${rate}%` }}
                    />
                </div>
            )}
        </div>
    );
}

export default function CampaignsPage() {
    // ─── TABS ────────────────────────
    const [activeTab, setActiveTab] = useState<'campaigns' | 'templates'>('campaigns');

    // ─── SWR Data ────────────────────────
    const { data: campaignsData, mutate: mutateCampaigns } = useSWR<Campaign[]>(`${api.API_URL}/api/campaigns`, fetcher);
    const { data: templatesData, mutate: mutateTemplates } = useSWR<PromotionTemplate[]>(`${api.API_URL}/api/templates`, fetcher);

    const campaigns = campaignsData || [];
    const templates = templatesData || [];
    const loading = !campaignsData;

    // ─── Global Stats ────────────────────────
    const totalSent = campaigns.reduce((s, c) => s + (c.sent_count || 0), 0);
    const totalFailed = campaigns.reduce((s, c) => s + (c.failed_count || 0), 0);
    const activeCount = campaigns.filter(c => c.status === 'active').length;

    // ─── Campaign State ────────────────────────
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [showCampaignModal, setShowCampaignModal] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<{ type: 'campaign' | 'template'; id: number } | null>(null);

    // Filters
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Runner State
    const [runnerStatus, setRunnerStatus] = useState<any>(null);
    const [isPolling, setIsPolling] = useState(false);

    // ─── Campaign Form ────────────────────────
    const [editId, setEditId] = useState<number | null>(null);
    const [form, setForm] = useState({
        name: '', message_template: '', target_type: 'leads',
        target_criteria: 'all', scheduled_at: '', template_id: 0,
        smart_ai: false
    });
    // Template preview state
    const [previewTemplateId, setPreviewTemplateId] = useState<number>(0);
    const previewTemplate = templates.find(t => t.id === previewTemplateId);

    const handleSaveCampaign = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                name: form.name,
                message_template: form.message_template,
                target_type: form.target_type,
                target_criteria: JSON.stringify({ type: form.target_criteria }),
                template_id: form.template_id || undefined,
                scheduled_at: form.scheduled_at || undefined,
                smart_ai: form.smart_ai
            };
            if (editId) {
                await api.updateCampaign(editId, payload);
            } else {
                await api.createCampaign(payload);
            }
            closeCampaignModal();
            mutateCampaigns();
        } catch { alert("Failed to save campaign"); }
    };

    const openEditCampaign = (c: Campaign) => {
        setEditId(c.id);
        let criteria = 'all';
        try { criteria = JSON.parse(c.target_criteria || '{}').type || 'all'; } catch { }
        setForm({
            name: c.name,
            message_template: c.message_template || '',
            target_type: c.target_type || 'leads',
            target_criteria: criteria,
            scheduled_at: c.scheduled_at ? c.scheduled_at.split('T')[0] : '',
            template_id: c.template_id || 0,
            smart_ai: c.smart_ai || false
        });
        setPreviewTemplateId(c.template_id || 0);
        setShowCampaignModal(true);
    };

    const openCreateCampaign = () => {
        setEditId(null);
        setForm({ name: '', message_template: '', target_type: 'leads', target_criteria: 'all', scheduled_at: '', template_id: 0, smart_ai: false });
        setPreviewTemplateId(0);
        setShowCampaignModal(true);
    };

    const closeCampaignModal = () => {
        setShowCampaignModal(false);
        setEditId(null);
        setPreviewTemplateId(0);
        setForm({ name: '', message_template: '', target_type: 'leads', target_criteria: 'all', scheduled_at: '', template_id: 0, smart_ai: false });
    };

    const handleLaunch = async (id: number) => {
        try {
            await api.launchCampaign(id);
            setIsPolling(true);
            setRunnerStatus({ state: 'running', logs: ['Initializing...'] });
        } catch (e: any) { alert(e.message || "Failed to launch"); }
    };

    const handleStopRunner = async () => {
        try { await api.stopCampaign(); } catch { alert("Failed to stop"); }
    };

    const handleStatus = async (id: number, status: string) => {
        try {
            await api.updateCampaign(id, { status });
            mutateCampaigns();
        } catch { alert("Failed to update status"); }
    };

    // ─── Template Form ────────────────────────
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [editTemplateId, setEditTemplateId] = useState<number | null>(null);
    const [tForm, setTForm] = useState({ title: '', category: 'general', content: '' });

    const handleSaveTemplate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const variables = JSON.stringify(
                (tForm.content.match(/\{(\w+)\}/g) || []).map(v => v.replace(/[{}]/g, ''))
            );
            if (editTemplateId) {
                await api.updateTemplate(editTemplateId, { ...tForm, variables });
            } else {
                await api.createTemplate({ ...tForm, variables });
            }
            setShowTemplateModal(false);
            setEditTemplateId(null);
            mutateTemplates();
        } catch { alert("Failed to save template"); }
    };

    const openEditTemplate = (t: PromotionTemplate) => {
        setEditTemplateId(t.id);
        setTForm({ title: t.title, category: t.category, content: t.content });
        setShowTemplateModal(true);
    };

    const openCreateTemplate = () => {
        setEditTemplateId(null);
        setTForm({ title: '', category: 'general', content: '' });
        setShowTemplateModal(true);
    };

    const handleUseTemplate = (t: PromotionTemplate) => {
        setForm(prev => ({ ...prev, message_template: t.content, template_id: t.id }));
        setPreviewTemplateId(t.id);
        setActiveTab('campaigns');
        setShowCampaignModal(true);
    };

    const handleSeedTemplates = async () => {
        try {
            await api.seedTemplates();
            mutateTemplates();
        } catch { alert("Failed to seed templates"); }
    };

    // ─── Delete Logic ────────────────────────
    const handleDelete = (type: 'campaign' | 'template', id: number) => {
        setDeleteTarget({ type, id });
        setShowConfirm(true);
    };

    const executeDelete = async () => {
        if (!deleteTarget) return;
        try {
            if (deleteTarget.type === 'campaign') {
                await api.deleteCampaign(deleteTarget.id);
                if (selectedId === deleteTarget.id) setSelectedId(null);
                mutateCampaigns();
            } else {
                await api.deleteTemplate(deleteTarget.id);
                mutateTemplates();
            }
        } catch { alert("Failed to delete"); }
        setShowConfirm(false);
        setDeleteTarget(null);
    };

    // ─── Filtered Campaigns ────────────────────────
    const filteredCampaigns = useMemo(() => {
        return campaigns.filter(c => {
            const matchStatus = filterStatus === 'all' || c.status === filterStatus;
            const matchSearch = !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase());
            return matchStatus && matchSearch;
        });
    }, [campaigns, filterStatus, searchQuery]);

    const selectedCampaign = campaigns.find(c => c.id === selectedId);

    // ─── Insert variable into template content ────────────────────────
    const insertVar = (v: string) => {
        setTForm(prev => ({ ...prev, content: prev.content + v }));
    };
    const insertVarCampaign = (v: string) => {
        setForm(prev => ({ ...prev, message_template: prev.message_template + v }));
    };

    const handleAIUseTemplate = (content: string) => {
        setTForm(prev => ({ ...prev, content: content }));
        setShowTemplateModal(true);
        setEditTemplateId(null);
    };

    return (
        <div className="w-full h-[calc(100vh-8rem)] flex flex-col gap-4">
            {/* ─── HEADER ─── */}
            <div className="flex flex-col gap-4 flex-shrink-0">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                            <Send className="w-8 h-8 text-primary" /> Campaign Automation
                        </h1>
                        <p className="text-muted-foreground mt-1 text-sm">Scale your outreach without getting blocked</p>
                    </div>
                    <div className="flex gap-2">
                        {activeTab === 'templates' && (
                            <>
                                {templates.length === 0 && (
                                    <button onClick={handleSeedTemplates} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl transition-all font-bold text-sm">
                                        <Rocket className="w-4 h-4" /> Seed Defaults
                                    </button>
                                )}
                                <button onClick={openCreateTemplate} className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-xl transition-all font-bold text-sm">
                                    <Plus className="w-4 h-4" /> New Template
                                </button>
                            </>
                        )}
                        {activeTab === 'campaigns' && (
                            <button onClick={openCreateCampaign} className="flex items-center gap-2 bg-[#25D366] hover:bg-[#20ba59] text-white px-6 py-3 rounded-xl transition-all font-bold shadow-[0_0_20px_rgba(37,211,102,0.3)]">
                                <Plus className="w-5 h-5" /> New Campaign
                            </button>
                        )}
                    </div>
                </div>

                {/* ─── GLOBAL STATS BAR ─── */}
                <div className="grid grid-cols-4 gap-3">
                    <div className="p-4 rounded-2xl border border-border bg-card flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-primary/10"><BarChart2 className="w-5 h-5 text-primary" /></div>
                        <div>
                            <p className="text-2xl font-bold text-foreground">{campaigns.length}</p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Total</p>
                        </div>
                    </div>
                    <div className="p-4 rounded-2xl border border-border bg-card flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-emerald-500/10"><TrendingUp className="w-5 h-5 text-emerald-500" /></div>
                        <div>
                            <p className="text-2xl font-bold text-emerald-500">{totalSent}</p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Total Sent</p>
                        </div>
                    </div>
                    <div className="p-4 rounded-2xl border border-border bg-card flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-destructive/10"><AlertCircle className="w-5 h-5 text-destructive" /></div>
                        <div>
                            <p className="text-2xl font-bold text-destructive">{totalFailed}</p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Failed</p>
                        </div>
                    </div>
                    <div className="p-4 rounded-2xl border border-border bg-card flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-blue-500/10"><Zap className="w-5 h-5 text-blue-500" /></div>
                        <div>
                            <p className="text-2xl font-bold text-blue-500">{activeCount}</p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Active Now</p>
                        </div>
                    </div>
                </div>

                {/* TABS + FILTERS */}
                <div className="flex items-center gap-4">
                    <div className="bg-accent/20 p-1 rounded-xl border border-border flex items-center">
                        <button onClick={() => setActiveTab('campaigns')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${activeTab === 'campaigns' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}>
                            <Zap className="w-3.5 h-3.5" /> Campaigns
                        </button>
                        <button onClick={() => setActiveTab('templates')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${activeTab === 'templates' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}>
                            <FileText className="w-3.5 h-3.5" /> Templates ({templates.length})
                        </button>
                    </div>

                    {activeTab === 'campaigns' && (
                        <>
                            <div className="bg-accent/20 p-1 rounded-xl border border-border flex items-center">
                                {['all', 'draft', 'active', 'paused', 'completed'].map(s => (
                                    <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-2 rounded-lg text-xs font-bold transition-all capitalize ${filterStatus === s ? 'bg-blue-600 text-white shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}>{s === 'all' ? 'All' : s}</button>
                                ))}
                            </div>
                            <div className="relative flex-1 max-w-xs">
                                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search campaigns..." className="w-full bg-input border border-border rounded-xl py-2.5 pl-10 pr-4 text-sm text-foreground focus:outline-none focus:border-blue-500/30" />
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* ─── LIVE CONSOLE ─── */}
            {(runnerStatus && runnerStatus.state !== 'idle') && (
                <div className="mb-2 p-6 bg-card border border-primary/30 rounded-2xl relative overflow-hidden backdrop-blur-md flex-shrink-0">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50 animate-pulse"></div>
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-[#25D366] font-bold flex items-center gap-2">
                                <WhatsAppIcon className="w-5 h-5 animate-pulse" /> Live Campaign Runner
                            </h3>
                            <p className="text-muted-foreground text-xs mt-1">
                                Status: <span className="text-foreground font-mono bg-accent px-2 py-0.5 rounded ml-2">{runnerStatus?.state.toUpperCase()}</span>
                            </p>
                        </div>
                        <button onClick={handleStopRunner} className="px-4 py-2 bg-destructive/10 text-destructive border border-destructive/30 rounded-lg text-xs font-bold hover:bg-destructive/20 transition-all">
                            STOP CAMPAIGN
                        </button>
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-center mb-4">
                        <div className="p-3 bg-muted/50 rounded-xl border border-border">
                            <div className="text-2xl font-bold text-foreground">{runnerStatus?.total || 0}</div>
                            <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Target</div>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-xl border border-border">
                            <div className="text-2xl font-bold text-emerald-500">{runnerStatus?.sent || 0}</div>
                            <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Sent</div>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-xl border border-border">
                            <div className="text-2xl font-bold text-destructive">{runnerStatus?.failed || 0}</div>
                            <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Failed</div>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-xl border border-border">
                            <div className="text-xs font-mono text-primary">{runnerStatus?.next_batch_at ? new Date(runnerStatus.next_batch_at).toLocaleTimeString() : 'Active'}</div>
                            <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Next Batch</div>
                        </div>
                    </div>
                    <div className="h-28 bg-muted rounded-xl border border-border p-3 font-mono text-xs text-muted-foreground overflow-y-auto custom-scrollbar">
                        {runnerStatus?.logs?.slice().reverse().map((log: string, i: number) => (
                            <div key={i} className="mb-1 border-b border-border/50 pb-1 last:border-0">{log}</div>
                        ))}
                    </div>
                </div>
            )}

            {/* ─── TEMPLATES TAB ─── */}
            {activeTab === 'templates' && (
                <div className="flex-1 overflow-y-auto">
                    <div className="mb-8">
                        <AITemplateGenerator onUseTemplate={handleAIUseTemplate} />
                    </div>
                    {templates.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                            <FileText className="w-20 h-20 text-primary/20 mb-6" />
                            <h3 className="text-2xl font-bold text-foreground">No Templates Yet</h3>
                            <p className="text-muted-foreground mt-2 mb-6">Create reusable message templates for your campaigns.</p>
                            <button onClick={handleSeedTemplates} className="px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold transition-all">
                                <Rocket className="w-4 h-4 inline mr-2" /> Load Default Templates
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {templates.map(t => (
                                <TemplateCard key={t.id} t={t}
                                    onEdit={() => openEditTemplate(t)}
                                    onDelete={() => handleDelete('template', t.id)}
                                    onUse={() => handleUseTemplate(t)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ─── CAMPAIGNS TAB ─── */}
            {activeTab === 'campaigns' && (
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
                    {/* List */}
                    <div className="lg:col-span-1 bg-card border border-border p-5 rounded-2xl overflow-y-auto flex flex-col">
                        <h2 className="text-sm font-bold text-foreground mb-4 flex-shrink-0 flex items-center gap-2">
                            <BarChart2 className="w-4 h-4 text-primary" /> Campaigns <span className="text-xs font-normal text-muted-foreground ml-auto">{filteredCampaigns.length}</span>
                        </h2>
                        {loading ? <p className="text-muted-foreground text-sm">Loading...</p> : (
                            <div className="space-y-3 flex-1">
                                {filteredCampaigns.length === 0 && <p className="text-muted-foreground text-sm">No campaigns found.</p>}
                                {filteredCampaigns.map(c => (
                                    <CampaignCard
                                        key={c.id}
                                        c={c}
                                        isSelected={selectedId === c.id}
                                        onClick={() => setSelectedId(c.id)}
                                        onLaunch={() => handleLaunch(c.id)}
                                        onEdit={() => openEditCampaign(c)}
                                        onDelete={() => handleDelete('campaign', c.id)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Details */}
                    <div className="lg:col-span-2 bg-card border border-border p-8 rounded-2xl flex flex-col relative overflow-hidden">
                        {selectedCampaign ? (
                            <div className="h-full flex flex-col">
                                <div className="flex justify-between items-start mb-6 pb-4 border-b border-border flex-shrink-0">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <h2 className="text-2xl font-bold text-foreground">{selectedCampaign.name}</h2>
                                            {selectedCampaign.smart_ai && (
                                                <span className="text-[10px] font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                    <Sparkles className="w-3 h-3" /> Smart AI
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <StatusBadge status={selectedCampaign.status} />
                                            <div className="h-4 w-[1px] bg-border"></div>
                                            <span className="text-muted-foreground text-sm flex items-center gap-1.5">
                                                <Tag className="w-3.5 h-3.5" /> {selectedCampaign.target_type || 'leads'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleLaunch(selectedCampaign.id)} className="p-2.5 bg-[#25D366] text-white rounded-xl hover:bg-[#20ba59] transition-all font-bold shadow-[0_0_15px_rgba(37,211,102,0.4)] flex items-center gap-1.5 text-sm" title="Launch Now">
                                            <WhatsAppIcon className="w-4 h-4" /> Launch
                                        </button>
                                        {selectedCampaign.status === 'active' ? (
                                            <button onClick={() => handleStatus(selectedCampaign.id, 'paused')} className="p-2.5 bg-amber-500/10 text-amber-500 rounded-xl hover:bg-amber-500/20 transition-all border border-amber-500/20" title="Pause">
                                                <Pause className="w-4 h-4" />
                                            </button>
                                        ) : (
                                            <button onClick={() => handleStatus(selectedCampaign.id, 'active')} className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl hover:bg-emerald-500/20 transition-all border border-emerald-500/20" title="Start">
                                                <Play className="w-4 h-4" />
                                            </button>
                                        )}
                                        <button onClick={() => openEditCampaign(selectedCampaign)} className="p-2.5 bg-blue-500/10 text-blue-500 rounded-xl hover:bg-blue-500/20 transition-all border border-blue-500/20" title="Edit">
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDelete('campaign', selectedCampaign.id)} className="p-2.5 bg-destructive/10 text-destructive rounded-xl hover:bg-destructive/20 transition-all border border-destructive/20" title="Delete">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className="grid grid-cols-3 gap-4 mb-6 flex-shrink-0">
                                    <div className="p-4 rounded-xl bg-muted/30 border border-border">
                                        <p className="text-muted-foreground text-xs uppercase tracking-widest mb-1">Sent</p>
                                        <p className="text-2xl font-bold text-emerald-500">{selectedCampaign.sent_count || 0}</p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-muted/30 border border-border">
                                        <p className="text-muted-foreground text-xs uppercase tracking-widest mb-1">Failed</p>
                                        <p className="text-2xl font-bold text-destructive">{selectedCampaign.failed_count || 0}</p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-muted/30 border border-border">
                                        <p className="text-muted-foreground text-xs uppercase tracking-widest mb-1">Success Rate</p>
                                        <p className="text-2xl font-bold text-blue-500">
                                            {(selectedCampaign.sent_count || 0) > 0
                                                ? Math.round(((selectedCampaign.sent_count || 0) / ((selectedCampaign.sent_count || 0) + (selectedCampaign.failed_count || 0))) * 100)
                                                : 0}%
                                        </p>
                                    </div>
                                </div>

                                {/* Message Preview */}
                                <div className="flex-1 bg-muted/50 rounded-xl p-5 border border-border overflow-y-auto">
                                    <h3 className="text-sm font-bold text-muted-foreground mb-3 uppercase tracking-widest flex items-center gap-2">
                                        <Eye className="w-4 h-4" /> Message Preview
                                    </h3>
                                    <div className="bg-background p-5 rounded-xl border border-border max-w-2xl">
                                        <p className="text-foreground whitespace-pre-line font-mono text-sm leading-relaxed">
                                            {selectedCampaign.message_template || <span className="text-muted-foreground italic">No template attached</span>}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                                <Zap className="w-20 h-20 text-primary/20 mb-6" />
                                <h3 className="text-2xl font-bold text-foreground">Select a Campaign</h3>
                                <p className="text-muted-foreground mt-2">View details, analytics, and manage your campaigns.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ─── CAMPAIGN MODAL ─── */}
            {showCampaignModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4" onClick={closeCampaignModal}>
                    <div className="bg-popover border border-border p-8 rounded-3xl w-full max-w-lg shadow-2xl relative" onClick={e => e.stopPropagation()}>
                        <h2 className="text-xl font-bold text-popover-foreground mb-6 flex items-center gap-2">
                            {editId ? <Edit className="w-5 h-5 text-primary" /> : <Plus className="w-5 h-5 text-primary" />}
                            {editId ? 'Edit Campaign' : 'New Campaign'}
                        </h2>
                        <form onSubmit={handleSaveCampaign} className="space-y-4">
                            <div>
                                <label className="block text-xs text-muted-foreground uppercase tracking-widest mb-2">Campaign Name</label>
                                <input type="text" className="w-full bg-input border border-border rounded-xl p-3 text-foreground focus:border-primary/50 outline-none"
                                    placeholder="e.g. Promo March" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs text-muted-foreground uppercase tracking-widest mb-2">Target Type</label>
                                    <select className="w-full bg-input border border-border rounded-xl p-3 text-foreground focus:border-primary/50 outline-none"
                                        value={form.target_type} onChange={e => setForm({ ...form, target_type: e.target.value })}>
                                        <option value="leads" className="bg-popover text-popover-foreground">Leads</option>
                                        <option value="prospects" className="bg-popover text-popover-foreground">Prospects</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-muted-foreground uppercase tracking-widest mb-2">Audience</label>
                                    <select className="w-full bg-input border border-border rounded-xl p-3 text-foreground focus:border-primary/50 outline-none"
                                        value={form.target_criteria} onChange={e => setForm({ ...form, target_criteria: e.target.value })}>
                                        <option value="all" className="bg-popover text-popover-foreground">All</option>
                                        <option value="high_score" className="bg-popover text-popover-foreground">High Score (&gt;75)</option>
                                        <option value="low_score" className="bg-popover text-popover-foreground">Low Score (&lt;50)</option>
                                        <option value="not_contacted" className="bg-popover text-popover-foreground">Belum Dihubungi</option>
                                        <option value="won" className="bg-popover text-popover-foreground">Won / Closed</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-muted-foreground uppercase tracking-widest mb-2">Schedule</label>
                                    <input type="date" className="w-full bg-input border border-border rounded-xl p-3 text-foreground focus:border-primary/50 outline-none"
                                        value={form.scheduled_at} onChange={e => setForm({ ...form, scheduled_at: e.target.value })} />
                                </div>
                            </div>

                            {/* Template picker with preview */}
                            {templates.length > 0 && (
                                <div>
                                    <label className="block text-xs text-muted-foreground uppercase tracking-widest mb-2">Use Template (Optional)</label>
                                    <select className="w-full bg-input border border-border rounded-xl p-3 text-foreground focus:border-primary/50 outline-none"
                                        value={form.template_id} onChange={e => {
                                            const tid = parseInt(e.target.value);
                                            const t = templates.find(t => t.id === tid);
                                            setForm({ ...form, template_id: tid, message_template: t?.content || form.message_template });
                                            setPreviewTemplateId(tid);
                                        }}>
                                        <option value={0} className="bg-popover text-popover-foreground">— Custom Message —</option>
                                        {templates.map(t => (
                                            <option key={t.id} value={t.id} className="bg-popover text-popover-foreground">{t.title} ({t.category})</option>
                                        ))}
                                    </select>
                                    {/* Template Preview */}
                                    {previewTemplate && (
                                        <div className="mt-2 p-3 bg-muted/30 border border-border/50 rounded-xl">
                                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Preview: {previewTemplate.title}</p>
                                            <p className="text-xs text-foreground/80 font-mono whitespace-pre-line line-clamp-4">{previewTemplate.content}</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div>
                                <label className="block text-xs text-muted-foreground uppercase tracking-widest mb-2">Message Template</label>
                                <textarea className="w-full h-28 bg-input border border-border rounded-xl p-3 text-foreground focus:border-primary/50 outline-none resize-none font-mono text-sm"
                                    placeholder="Hello {name}..." value={form.message_template} onChange={e => setForm({ ...form, message_template: e.target.value })} />
                                <VariablePicker onInsert={insertVarCampaign} />
                            </div>

                            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${form.smart_ai ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                                            <Zap className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-foreground">Smart AI Personalization</h4>
                                            <p className="text-[10px] text-muted-foreground">Unique message for every recipient ✨</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setForm({ ...form, smart_ai: !form.smart_ai })}
                                        className={`w-12 h-6 rounded-full relative transition-colors ${form.smart_ai ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                                    >
                                        <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${form.smart_ai ? 'translate-x-6' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={closeCampaignModal} className="px-5 py-3 rounded-xl border border-border text-muted-foreground hover:text-foreground transition-all text-sm font-bold">Cancel</button>
                                <button type="submit" className="px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl transition-all text-sm">Save Campaign</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ─── TEMPLATE MODAL ─── */}
            {showTemplateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4" onClick={() => { setShowTemplateModal(false); setEditTemplateId(null); }}>
                    <div className="bg-popover border border-border p-8 rounded-3xl w-full max-w-lg shadow-2xl relative" onClick={e => e.stopPropagation()}>
                        <h2 className="text-xl font-bold text-popover-foreground mb-6 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-primary" />
                            {editTemplateId ? 'Edit Template' : 'New Template'}
                        </h2>
                        <form onSubmit={handleSaveTemplate} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs text-muted-foreground uppercase tracking-widest mb-2">Title</label>
                                    <input type="text" className="w-full bg-input border border-border rounded-xl p-3 text-foreground focus:border-primary/50 outline-none"
                                        placeholder="e.g. Outreach Pesantren" value={tForm.title} onChange={e => setTForm({ ...tForm, title: e.target.value })} required />
                                </div>
                                <div>
                                    <label className="block text-xs text-muted-foreground uppercase tracking-widest mb-2">Category</label>
                                    <select className="w-full bg-input border border-border rounded-xl p-3 text-foreground focus:border-primary/50 outline-none"
                                        value={tForm.category} onChange={e => setTForm({ ...tForm, category: e.target.value })}>
                                        <option value="general" className="bg-popover text-popover-foreground">General</option>
                                        <option value="pesantren" className="bg-popover text-popover-foreground">Pesantren</option>
                                        <option value="sekolah" className="bg-popover text-popover-foreground">Sekolah</option>
                                        <option value="umkm" className="bg-popover text-popover-foreground">UMKM</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs text-muted-foreground uppercase tracking-widest mb-2">Message Content</label>
                                <textarea className="w-full h-36 bg-input border border-border rounded-xl p-3 text-foreground focus:border-primary/50 outline-none resize-none font-mono text-sm"
                                    placeholder="Assalamu'alaikum {name}..." value={tForm.content} onChange={e => setTForm({ ...tForm, content: e.target.value })} required />
                                <VariablePicker onInsert={insertVar} />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => { setShowTemplateModal(false); setEditTemplateId(null); }} className="px-5 py-3 rounded-xl border border-border text-muted-foreground hover:text-foreground transition-all text-sm font-bold">Cancel</button>
                                <button type="submit" className="px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl transition-all text-sm">Save Template</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={showConfirm}
                title={`Delete ${deleteTarget?.type === 'campaign' ? 'Campaign' : 'Template'}`}
                message="Are you sure? This action cannot be undone."
                onConfirm={executeDelete}
                onCancel={() => { setShowConfirm(false); setDeleteTarget(null); }}
            />
        </div>
    );
}
