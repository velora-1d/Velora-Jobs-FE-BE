'use client';

import React, { useState, useEffect } from 'react';
import { Send, Users, Zap, Plus, X, Edit, Trash2, Calendar, Play, Pause, CheckCircle2 } from 'lucide-react';
import { api, Campaign } from '@/lib/api';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

export default function CampaignsPage() {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    // Form
    const [editId, setEditId] = useState<number | null>(null);
    const [form, setForm] = useState({ name: '', message_template: '', target_criteria: 'all', scheduled_at: '' });

    useEffect(() => { loadCampaigns(); }, []);

    const loadCampaigns = async () => {
        try {
            const data = await api.getCampaigns();
            setCampaigns(data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

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
            loadCampaigns();
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
            loadCampaigns();
        } catch (e) { alert("Failed to delete"); }
    };

    const handleStatus = async (id: number, status: string) => {
        try {
            await api.updateCampaign(id, { status });
            loadCampaigns();
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

    const selectedCampaign = campaigns.find(c => c.id === selectedId);

    return (
        <div className="w-full h-[calc(100vh-8rem)] flex flex-col">
            <div className="flex justify-between items-center mb-8 flex-shrink-0">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <Send className="w-8 h-8 text-amber-400" /> Campaign Automation
                    </h1>
                    <p className="text-slate-400 mt-2">Scale your outreach without getting blocked</p>
                </div>
                <button onClick={openCreate} className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-black px-6 py-3 rounded-xl transition-all font-bold shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                    <Plus className="w-5 h-5" /> New Campaign
                </button>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-0">
                {/* List */}
                <div className="lg:col-span-1 glass-panel p-6 rounded-3xl overflow-y-auto flex flex-col">
                    <h2 className="text-lg font-bold text-white mb-6 flex-shrink-0">Recent Campaigns</h2>
                    {loading ? <p className="text-slate-500">Loading...</p> : (
                        <div className="space-y-4 flex-1">
                            {campaigns.length === 0 && <p className="text-slate-500 text-sm">No campaigns yet.</p>}
                            {campaigns.map(c => (
                                <div key={c.id} onClick={() => setSelectedId(c.id)}
                                    className={`p-4 rounded-xl border transition-all cursor-pointer group ${selectedId === c.id ? 'bg-amber-500/10 border-amber-500/50' : 'bg-[#ffffff03] border-[#ffffff05] hover:border-amber-500/30'}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`text-sm font-bold ${selectedId === c.id ? 'text-amber-400' : 'text-slate-200'}`}>{c.name}</span>
                                        <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-wider ${c.status === 'draft' ? 'bg-slate-500/10 text-slate-400' : c.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                            {c.status}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs text-slate-500 mb-2">
                                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> Target: {c.target_criteria ? JSON.parse(c.target_criteria).type : 'All'}</span>
                                        {c.scheduled_at && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(c.scheduled_at).toLocaleDateString()}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Details */}
                <div className="lg:col-span-2 glass-panel p-8 rounded-3xl flex flex-col relative overflow-hidden">
                    {selectedCampaign ? (
                        <div className="h-full flex flex-col">
                            <div className="flex justify-between items-start mb-8 pb-6 border-b border-[#ffffff05] flex-shrink-0">
                                <div>
                                    <h2 className="text-3xl font-bold text-white mb-2">{selectedCampaign.name}</h2>
                                    <div className="flex items-center gap-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${selectedCampaign.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'}`}>
                                            {selectedCampaign.status}
                                        </span>
                                        <div className="h-4 w-[1px] bg-slate-700"></div>
                                        <span className="text-slate-400 text-sm flex items-center gap-2"><Users className="w-4 h-4" /> {JSON.parse(selectedCampaign.target_criteria || '{}').type || 'All'} Leads</span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {selectedCampaign.status === 'active' ? (
                                        <button onClick={() => handleStatus(selectedCampaign.id, 'paused')} className="p-3 bg-amber-500/10 text-amber-400 rounded-xl hover:bg-amber-500/20 transition-all border border-amber-500/20" title="Pause">
                                            <Pause className="w-5 h-5" />
                                        </button>
                                    ) : (
                                        <button onClick={() => handleStatus(selectedCampaign.id, 'active')} className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl hover:bg-emerald-500/20 transition-all border border-emerald-500/20" title="Start">
                                            <Play className="w-5 h-5" />
                                        </button>
                                    )}
                                    <button onClick={() => openEdit(selectedCampaign)} className="p-3 bg-blue-500/10 text-blue-400 rounded-xl hover:bg-blue-500/20 transition-all border border-blue-500/20" title="Edit">
                                        <Edit className="w-5 h-5" />
                                    </button>
                                    <button onClick={() => handleDelete(selectedCampaign.id)} className="p-3 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500/20 transition-all border border-red-500/20" title="Delete">
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-6 mb-8 flex-shrink-0">
                                <div className="p-5 rounded-2xl bg-[#ffffff03] border border-[#ffffff05]">
                                    <p className="text-slate-500 text-xs uppercase tracking-widest mb-1">Sent</p>
                                    <p className="text-2xl font-bold text-white">0</p>
                                </div>
                                <div className="p-5 rounded-2xl bg-[#ffffff03] border border-[#ffffff05]">
                                    <p className="text-slate-500 text-xs uppercase tracking-widest mb-1">Replied</p>
                                    <p className="text-2xl font-bold text-emerald-400">0</p>
                                </div>
                                <div className="p-5 rounded-2xl bg-[#ffffff03] border border-[#ffffff05]">
                                    <p className="text-slate-500 text-xs uppercase tracking-widest mb-1">CTR</p>
                                    <p className="text-2xl font-bold text-blue-400">0%</p>
                                </div>
                            </div>

                            <div className="flex-1 bg-black/20 rounded-2xl p-6 border border-[#ffffff05] overflow-y-auto">
                                <h3 className="text-sm font-bold text-slate-400 mb-4 uppercase tracking-widest">Message Preview</h3>
                                <div className="bg-[#0f1117] p-6 rounded-xl border border-[#ffffff08] max-w-2xl">
                                    <p className="text-slate-300 whitespace-pre-line font-mono text-sm leading-relaxed">
                                        {selectedCampaign.message_template}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                            <Zap className="w-20 h-20 text-amber-500/20 mb-6" />
                            <h3 className="text-2xl font-bold text-slate-300">Select a Campaign</h3>
                            <p className="text-slate-500 mt-2">View details, analytics, and manage your campaigns.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={closeModal}>
                    <div className="bg-[#0f172a] border border-[#ffffff10] p-8 rounded-3xl w-full max-w-lg shadow-2xl relative" onClick={e => e.stopPropagation()}>
                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            {editId ? <Edit className="w-5 h-5 text-amber-400" /> : <Plus className="w-5 h-5 text-amber-400" />}
                            {editId ? 'Edit Campaign' : 'New Campaign'}
                        </h2>
                        <form onSubmit={handleSave} className="space-y-5">
                            <div>
                                <label className="block text-xs text-slate-500 uppercase tracking-widest mb-2">Campaign Name</label>
                                <input type="text" className="w-full bg-[#0a0c10] border border-[#ffffff10] rounded-xl p-3 text-slate-200 focus:border-amber-500/50 outline-none"
                                    placeholder="e.g. Promo March" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-slate-500 uppercase tracking-widest mb-2">Target Audience</label>
                                    <select className="w-full bg-[#0a0c10] border border-[#ffffff10] rounded-xl p-3 text-slate-200 focus:border-amber-500/50 outline-none"
                                        value={form.target_criteria} onChange={e => setForm({ ...form, target_criteria: e.target.value })}>
                                        <option value="all" className="bg-[#0f1117]">All Leads</option>
                                        <option value="high_score" className="bg-[#0f1117]">High Score Leads (&gt;75)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-500 uppercase tracking-widest mb-2">Schedule (Optional)</label>
                                    <input type="date" className="w-full bg-[#0a0c10] border border-[#ffffff10] rounded-xl p-3 text-slate-200 focus:border-amber-500/50 outline-none"
                                        value={form.scheduled_at} onChange={e => setForm({ ...form, scheduled_at: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs text-slate-500 uppercase tracking-widest mb-2">Message Template</label>
                                <textarea className="w-full h-32 bg-[#0a0c10] border border-[#ffffff10] rounded-xl p-3 text-slate-200 focus:border-amber-500/50 outline-none resize-none font-mono text-sm"
                                    placeholder="Hello {name}..." value={form.message_template} onChange={e => setForm({ ...form, message_template: e.target.value })} />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={closeModal} className="px-5 py-3 rounded-xl border border-[#ffffff10] text-slate-400 hover:text-white transition-all text-sm font-bold">Cancel</button>
                                <button type="submit" className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)] text-sm">Save Campaign</button>
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
