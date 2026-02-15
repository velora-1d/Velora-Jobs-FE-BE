'use client';

import React, { useState, useEffect, useMemo } from 'react';
import useSWR from 'swr';
import { Send, Users, Zap, Plus, X, Edit, Trash2, Calendar, Play, Pause, CheckCircle2, Search } from 'lucide-react';
import { api, fetcher, Campaign } from '@/lib/api';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon';

export default function CampaignsPage() {
    // SWR
    const { data: campaignsData, mutate: mutateCampaigns } = useSWR<Campaign[]>(`${api.API_URL}/api/campaigns`, fetcher);

    const campaigns = campaignsData || [];
    const loading = !campaignsData;

    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    // Filters
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Runner State
    const [runnerStatus, setRunnerStatus] = useState<any>(null);
    const [isPolling, setIsPolling] = useState(false);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isPolling || (runnerStatus && runnerStatus.state === 'running')) {
            interval = setInterval(async () => {
                const status = await api.getCampaignStatus();
                setRunnerStatus(status);
                if (status.state === 'idle' || status.state === 'completed' || status.state === 'error') {
                    // Stop polling after 5 seconds of idle state to show final result?
                    // For now, simple logic:
                    if (status.state === 'idle') setIsPolling(false);
                }
            }, 2000);
        }
        return () => clearInterval(interval);
    }, [isPolling, runnerStatus]);

    const handleLaunch = async (id: number) => {
        try {
            await api.launchCampaign(id);
            setIsPolling(true);
            // set initial status manually to force UI to show up
            setRunnerStatus({ state: 'running', logs: ['Initializing...'] });
        } catch (e: any) {
            alert(e.message || "Failed to launch");
        }
    };

    const handleStopRunner = async () => {
        try {
            await api.stopCampaign();
        } catch (e) { alert("Failed to stop"); }
    };

    // Form
    const [editId, setEditId] = useState<number | null>(null);
    const [form, setForm] = useState({ name: '', message_template: '', target_criteria: 'all', scheduled_at: '' });

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                name: form.name,
                message_template: form.message_template,
                target_criteria: JSON.stringify({ type: form.target_criteria }),
                scheduled_at: form.scheduled_at || undefined
            };

            if (editId) {
                await api.updateCampaign(editId, payload);
            } else {
                await api.createCampaign(payload);
            }
            closeModal();
            mutateCampaigns();
        } catch (error) { alert("Failed to save campaign"); }
    };

    const handleDelete = async (id: number) => {
        setDeleteId(id);
        setShowConfirm(true);
    };

    const executeDelete = async () => {
        if (!deleteId) return;
        try {
            await api.deleteCampaign(deleteId);
            setShowConfirm(false);
            setDeleteId(null);
            if (selectedId === deleteId) setSelectedId(null);
            mutateCampaigns();
        } catch (e) { alert("Failed to delete"); }
    };

    const handleStatus = async (id: number, status: string) => {
        try {
            await api.updateCampaign(id, { status });
            mutateCampaigns();
        } catch (e) { alert("Failed to update status"); }
    };

    const openEdit = (c: Campaign) => {
        setEditId(c.id);
        let criteria = 'all';
        try { criteria = JSON.parse(c.target_criteria || '{}').type || 'all'; } catch { }

        setForm({
            name: c.name,
            message_template: c.message_template || '',
            target_criteria: criteria,
            scheduled_at: c.scheduled_at ? c.scheduled_at.split('T')[0] : ''
        });
        setShowModal(true);
    };

    const openCreate = () => {
        setEditId(null);
        setForm({ name: '', message_template: '', target_criteria: 'all', scheduled_at: '' });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditId(null);
    };

    const filteredCampaigns = useMemo(() => {
        return campaigns.filter(c => {
            const matchStatus = filterStatus === 'all' || c.status === filterStatus;
            const matchSearch = !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase());
            return matchStatus && matchSearch;
        });
    }, [campaigns, filterStatus, searchQuery]);

    const selectedCampaign = campaigns.find(c => c.id === selectedId);

    return (
        <div className="w-full h-[calc(100vh-8rem)] flex flex-col">
            <div className="flex flex-col gap-4 mb-8 flex-shrink-0">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                            <Send className="w-8 h-8 text-primary" /> Campaign Automation
                        </h1>
                        <p className="text-muted-foreground mt-2">Scale your outreach without getting blocked · {filteredCampaigns.length} campaigns</p>
                    </div>
                    <button onClick={openCreate} className="flex items-center gap-2 bg-[#25D366] hover:bg-[#20ba59] text-white px-6 py-3 rounded-xl transition-all font-bold shadow-[0_0_20px_rgba(37,211,102,0.3)]">
                        <Plus className="w-5 h-5" /> New Campaign
                    </button>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-accent/20 p-1 rounded-xl border border-border flex items-center">
                        {['all', 'draft', 'active', 'paused', 'completed'].map(s => (
                            <button key={s} onClick={() => setFilterStatus(s)} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all capitalize ${filterStatus === s ? 'bg-blue-600 text-white shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}>{s === 'all' ? 'All' : s}</button>
                        ))}
                    </div>
                    <div className="relative flex-1 max-w-xs">
                        <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search campaigns..." className="w-full bg-input border border-border rounded-xl py-2.5 pl-10 pr-4 text-sm text-foreground focus:outline-none focus:border-blue-500/30" />
                    </div>
                </div>
            </div>

            {/* Live Console (Visible if polling or running) */}
            {(runnerStatus && runnerStatus.state !== 'idle') && (
                <div className="mb-8 p-6 bg-card border border-primary/30 rounded-2xl relative overflow-hidden backdrop-blur-md">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50 animate-pulse"></div>
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-[#25D366] font-bold flex items-center gap-2">
                                <WhatsAppIcon className="w-5 h-5 animate-pulse" /> Live Campaign Runner
                            </h3>
                            <p className="text-muted-foreground text-xs mt-1">
                                Status: <span className="text-foreground font-mono bg-accent px-2 py-0.5 rounded ml-2">{runnerStatus?.state.toUpperCase()}</span>
                                {runnerStatus?.current_lead && <span className="text-muted-foreground ml-2">• Sending to: {runnerStatus.current_lead}</span>}
                            </p>
                        </div>
                        <button onClick={handleStopRunner} className="px-4 py-2 bg-destructive/10 text-destructive border border-destructive/30 rounded-lg text-xs font-bold hover:bg-destructive/20 transition-all">
                            STOP CAMPAIGN
                        </button>
                    </div>

                    <div className="grid grid-cols-4 gap-4 text-center mb-6">
                        <div className="p-4 bg-muted/50 rounded-xl border border-border">
                            <div className="text-3xl font-bold text-foreground">{runnerStatus?.total || 0}</div>
                            <div className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Target</div>
                        </div>
                        <div className="p-4 bg-muted/50 rounded-xl border border-border">
                            <div className="text-3xl font-bold text-emerald-500">{runnerStatus?.sent || 0}</div>
                            <div className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Sent</div>
                        </div>
                        <div className="p-4 bg-muted/50 rounded-xl border border-border">
                            <div className="text-3xl font-bold text-destructive">{runnerStatus?.failed || 0}</div>
                            <div className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Failed</div>
                        </div>
                        <div className="p-4 bg-muted/50 rounded-xl border border-border flex flex-col justify-center items-center">
                            <div className="text-xs font-mono text-primary">
                                {runnerStatus?.next_batch_at ? new Date(runnerStatus.next_batch_at).toLocaleTimeString() : 'Active'}
                            </div>
                            <div className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Next Batch</div>
                        </div>
                    </div>

                    <div className="h-40 bg-muted rounded-xl border border-border p-4 font-mono text-xs text-muted-foreground overflow-y-auto custom-scrollbar">
                        {runnerStatus?.logs?.slice().reverse().map((log: string, i: number) => (
                            <div key={i} className="mb-1 border-b border-border/50 pb-1 last:border-0 last:pb-0">{log}</div>
                        ))}
                        {!runnerStatus?.logs?.length && <p className="italic">Waiting for logs...</p>}
                    </div>
                </div>
            )}

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-0">
                {/* List */}
                <div className="lg:col-span-1 glass-panel p-6 rounded-3xl overflow-y-auto flex flex-col bg-card border border-border">
                    <h2 className="text-lg font-bold text-foreground mb-6 flex-shrink-0">Recent Campaigns</h2>
                    {loading ? <p className="text-muted-foreground">Loading...</p> : (
                        <div className="space-y-4 flex-1">
                            {filteredCampaigns.length === 0 && <p className="text-muted-foreground text-sm">No campaigns found.</p>}
                            {filteredCampaigns.map(c => (
                                <div key={c.id} onClick={() => setSelectedId(c.id)}
                                    className={`p-4 rounded-xl border transition-all cursor-pointer group ${selectedId === c.id ? 'bg-primary/10 border-primary/50' : 'bg-muted/30 border-border hover:border-primary/30'}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`text-sm font-bold ${selectedId === c.id ? 'text-primary' : 'text-foreground'}`}>{c.name}</span>
                                        <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-wider ${c.status === 'draft' ? 'bg-muted text-muted-foreground' : c.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                            {c.status}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> Target: {c.target_criteria ? JSON.parse(c.target_criteria).type : 'All'}</span>
                                        {c.scheduled_at && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(c.scheduled_at).toLocaleDateString()}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Details */}
                <div className="lg:col-span-2 glass-panel p-8 rounded-3xl flex flex-col relative overflow-hidden bg-card border border-border">
                    {selectedCampaign ? (
                        <div className="h-full flex flex-col">
                            <div className="flex justify-between items-start mb-8 pb-6 border-b border-border flex-shrink-0">
                                <div>
                                    <h2 className="text-3xl font-bold text-foreground mb-2">{selectedCampaign.name}</h2>
                                    <div className="flex items-center gap-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${selectedCampaign.status === 'active' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-muted text-muted-foreground border border-border'}`}>
                                            {selectedCampaign.status}
                                        </span>
                                        <div className="h-4 w-[1px] bg-border"></div>
                                        <span className="text-muted-foreground text-sm flex items-center gap-2"><Users className="w-4 h-4" /> {JSON.parse(selectedCampaign.target_criteria || '{}').type || 'All'} Leads</span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {/* LAUNCH BUTTON */}
                                    <button onClick={() => handleLaunch(selectedCampaign.id)} className="p-3 bg-[#25D366] text-white rounded-xl hover:bg-[#20ba59] transition-all font-bold shadow-[0_0_15px_rgba(37,211,102,0.4)] flex items-center gap-2" title="Launch Now">
                                        <WhatsAppIcon className="w-5 h-5" /> Launch
                                    </button>

                                    {selectedCampaign.status === 'active' ? (
                                        <button onClick={() => handleStatus(selectedCampaign.id, 'paused')} className="p-3 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-all border border-primary/20" title="Pause">
                                            <Pause className="w-5 h-5" />
                                        </button>
                                    ) : (
                                        <button onClick={() => handleStatus(selectedCampaign.id, 'active')} className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl hover:bg-emerald-500/20 transition-all border border-emerald-500/20" title="Start">
                                            <Play className="w-5 h-5" />
                                        </button>
                                    )}
                                    <button onClick={() => openEdit(selectedCampaign)} className="p-3 bg-blue-500/10 text-blue-500 rounded-xl hover:bg-blue-500/20 transition-all border border-blue-500/20" title="Edit">
                                        <Edit className="w-5 h-5" />
                                    </button>
                                    <button onClick={() => handleDelete(selectedCampaign.id)} className="p-3 bg-destructive/10 text-destructive rounded-xl hover:bg-destructive/20 transition-all border border-destructive/20" title="Delete">
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-6 mb-8 flex-shrink-0">
                                <div className="p-5 rounded-2xl bg-muted/30 border border-border">
                                    <p className="text-muted-foreground text-xs uppercase tracking-widest mb-1">Sent</p>
                                    <p className="text-2xl font-bold text-foreground">0</p>
                                </div>
                                <div className="p-5 rounded-2xl bg-muted/30 border border-border">
                                    <p className="text-muted-foreground text-xs uppercase tracking-widest mb-1">Replied</p>
                                    <p className="text-2xl font-bold text-emerald-500">0</p>
                                </div>
                                <div className="p-5 rounded-2xl bg-muted/30 border border-border">
                                    <p className="text-muted-foreground text-xs uppercase tracking-widest mb-1">CTR</p>
                                    <p className="text-2xl font-bold text-blue-500">0%</p>
                                </div>
                            </div>

                            <div className="flex-1 bg-muted/50 rounded-2xl p-6 border border-border overflow-y-auto">
                                <h3 className="text-sm font-bold text-muted-foreground mb-4 uppercase tracking-widest">Message Preview</h3>
                                <div className="bg-background p-6 rounded-xl border border-border max-w-2xl shadow-sm">
                                    <p className="text-foreground whitespace-pre-line font-mono text-sm leading-relaxed">
                                        {selectedCampaign.message_template}
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

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4" onClick={closeModal}>
                    <div className="bg-popover border border-border p-8 rounded-3xl w-full max-w-lg shadow-2xl relative" onClick={e => e.stopPropagation()}>
                        <h2 className="text-xl font-bold text-popover-foreground mb-6 flex items-center gap-2">
                            {editId ? <Edit className="w-5 h-5 text-primary" /> : <Plus className="w-5 h-5 text-primary" />}
                            {editId ? 'Edit Campaign' : 'New Campaign'}
                        </h2>
                        <form onSubmit={handleSave} className="space-y-5">
                            <div>
                                <label className="block text-xs text-muted-foreground uppercase tracking-widest mb-2">Campaign Name</label>
                                <input type="text" className="w-full bg-input border border-border rounded-xl p-3 text-foreground focus:border-primary/50 outline-none"
                                    placeholder="e.g. Promo March" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-muted-foreground uppercase tracking-widest mb-2">Target Audience</label>
                                    <select className="w-full bg-input border border-border rounded-xl p-3 text-foreground focus:border-primary/50 outline-none"
                                        value={form.target_criteria} onChange={e => setForm({ ...form, target_criteria: e.target.value })}>
                                        <option value="all" className="bg-popover text-popover-foreground">All Leads</option>
                                        <option value="high_score" className="bg-popover text-popover-foreground w-full">High Score Leads (&gt;75)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-muted-foreground uppercase tracking-widest mb-2">Schedule (Optional)</label>
                                    <input type="date" className="w-full bg-input border border-border rounded-xl p-3 text-foreground focus:border-primary/50 outline-none"
                                        value={form.scheduled_at} onChange={e => setForm({ ...form, scheduled_at: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs text-muted-foreground uppercase tracking-widest mb-2">Message Template</label>
                                <textarea className="w-full h-32 bg-input border border-border rounded-xl p-3 text-foreground focus:border-primary/50 outline-none resize-none font-mono text-sm"
                                    placeholder="Hello {name}..." value={form.message_template} onChange={e => setForm({ ...form, message_template: e.target.value })} />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={closeModal} className="px-5 py-3 rounded-xl border border-border text-muted-foreground hover:text-foreground transition-all text-sm font-bold">Cancel</button>
                                <button type="submit" className="px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)] text-sm">Save Campaign</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={showConfirm}
                title="Delete Campaign"
                message="Are you sure you want to delete this campaign? This action cannot be undone."
                onConfirm={executeDelete}
                onCancel={() => {
                    setShowConfirm(false);
                    setDeleteId(null);
                }}
            />
        </div>
    );
}
