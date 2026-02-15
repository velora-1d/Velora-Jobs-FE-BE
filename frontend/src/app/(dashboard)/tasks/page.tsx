'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer, ToolbarProps, EventProps } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import {
    Plus, List, Calendar as CalendarIcon, CheckSquare, X,
    ChevronLeft, ChevronRight, Hash, Clock, Trash2, Edit
} from 'lucide-react';
import useSWR from 'swr';
import { api, fetcher, FollowUp, Lead } from '@/lib/api';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

const localizer = momentLocalizer(moment);

interface CalendarEvent {
    id: number;
    title: string;
    start: Date;
    end: Date;
    allDay?: boolean;
    resource?: any;
    status: string;
    type: string;
}

// ─── Custom Toolbar ──────────────────────────────
const CustomToolbar = (toolbar: ToolbarProps<CalendarEvent, object>) => {
    const goToBack = () => { toolbar.onNavigate('PREV'); };
    const goToNext = () => { toolbar.onNavigate('NEXT'); };
    const goToCurrent = () => { toolbar.onNavigate('TODAY'); };

    const label = () => {
        const date = moment(toolbar.date);
        return (
            <span className="text-xl font-bold text-foreground capitalize">
                {date.format('MMMM')} <span className="text-muted-foreground">{date.format('YYYY')}</span>
            </span>
        );
    };

    return (
        <div className="flex items-center justify-between mb-6 p-1">
            <div className="flex items-center gap-4">
                {label()}
                <div className="flex bg-accent/20 rounded-xl border border-border p-1">
                    <button onClick={goToBack} className="p-2 hover:bg-accent/30 rounded-lg text-muted-foreground hover:text-foreground transition-colors">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button onClick={goToCurrent} className="px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors">
                        Today
                    </button>
                    <button onClick={goToNext} className="p-2 hover:bg-accent/30 rounded-lg text-muted-foreground hover:text-foreground transition-colors">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="flex bg-accent/20 rounded-xl border border-border p-1">
                <button
                    onClick={() => toolbar.onView('month')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${toolbar.view === 'month' ? 'bg-blue-500/20 text-blue-500' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    Month
                </button>
                <button
                    onClick={() => toolbar.onView('week')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${toolbar.view === 'week' ? 'bg-blue-500/20 text-blue-500' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    Week
                </button>
                <button
                    onClick={() => toolbar.onView('day')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${toolbar.view === 'day' ? 'bg-blue-500/20 text-blue-500' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    Day
                </button>
            </div>
        </div>
    );
};

// ─── Custom Event ──────────────────────────────
const CustomEvent = ({ event }: EventProps<CalendarEvent>) => {
    let colorClass = 'bg-blue-500/20 border-blue-500/40 text-blue-500';
    if (event.status === 'done') colorClass = 'bg-emerald-500/20 border-emerald-500/40 text-emerald-500 opacity-60 line-through';
    else if (event.type === 'meeting') colorClass = 'bg-purple-500/20 border-purple-500/40 text-purple-500';
    else if (event.type === 'call') colorClass = 'bg-amber-500/20 border-amber-500/40 text-amber-500';

    return (
        <div className={`h-full w-full px-2 py-1 rounded-md border text-xs font-medium truncate transition-all hover:scale-[1.02] ${colorClass}`}>
            {event.title}
        </div>
    );
};

export default function TasksPage() {
    // SWR
    const { data: tasksData, mutate: mutateTasks } = useSWR<FollowUp[]>(`${api.API_URL}/api/followups`, fetcher);
    const { data: leadsData } = useSWR<Lead[]>(`${api.API_URL}/api/leads`, fetcher);

    const leads = leadsData || [];
    const loading = !tasksData;

    // Map events
    const events: CalendarEvent[] = (tasksData || []).map(t => {
        const startDate = t.next_follow_date ? new Date(t.next_follow_date) : new Date(t.created_at || Date.now());
        const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hr default

        return {
            id: t.id,
            title: `${t.lead_title}: ${t.note}`,
            start: startDate,
            end: endDate,
            allDay: !t.next_follow_date,
            status: t.status,
            type: t.type,
            resource: t
        };
    });

    const [view, setView] = useState<'calendar' | 'list'>('calendar');
    const [showModal, setShowModal] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    // Form State
    const [editId, setEditId] = useState<number | null>(null);
    const [selectedLeadId, setSelectedLeadId] = useState<string>('');
    const [taskNote, setTaskNote] = useState('');
    const [taskDate, setTaskDate] = useState('');
    const [taskType, setTaskType] = useState('wa');

    const handleSaveTask = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editId) {
                // Update
                await api.updateFollowUp(editId, {
                    type: taskType,
                    note: taskNote,
                    status: 'pending',
                    next_follow_date: taskDate
                });
            } else {
                // Create
                if (!selectedLeadId) return;
                await api.createFollowUp({
                    lead_id: parseInt(selectedLeadId),
                    type: taskType,
                    note: taskNote,
                    next_follow_date: taskDate
                });
            }
            closeModal();
            mutateTasks();
        } catch (error) { alert('Failed to save task'); }
    };

    const handleDelete = async () => {
        setShowConfirm(true);
    };

    const executeDelete = async () => {
        if (!editId) return;
        try {
            await api.deleteFollowUp(editId);
            setShowConfirm(false);
            closeModal();
            mutateTasks();
        } catch (e) { alert('Failed to delete'); }
    };

    const openCreateModal = () => {
        setEditId(null);
        setSelectedLeadId('');
        setTaskNote('');
        setTaskDate(new Date().toISOString().split('T')[0]);
        setTaskType('wa');
        setShowModal(true);
    };

    const openEditModal = (event: CalendarEvent) => {
        setEditId(event.id);
        const t = event.resource as FollowUp;
        setSelectedLeadId(t.lead_id.toString());
        setTaskNote(t.note);
        setTaskDate(t.next_follow_date ? t.next_follow_date.split('T')[0] : '');
        setTaskType(t.type);
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditId(null);
    };

    return (
        <div className="w-full h-[calc(100vh-8rem)] flex flex-col relative">
            <style jsx global>{`
                .rbc-calendar { font-family: inherit; }
                .rbc-month-view, .rbc-time-view, .rbc-agenda-view { border: none; }
                .rbc-header { border-bottom: 1px solid hsl(var(--border)); color: hsl(var(--muted-foreground)); font-weight: 600; padding: 12px 0; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; }
                .rbc-day-bg { border-left: 1px solid hsl(var(--border)); }
                .rbc-off-range-bg { bg: transparent; opacity: 0.3; }
                .rbc-today { background-color: hsl(var(--accent) / 0.1); }
                .rbc-event { background: transparent; padding: 0; }
                .rbc-row-segment { padding: 2px 4px; }
            `}</style>

            <div className="flex justify-between items-center mb-0">
                <div>
                    <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                        <CheckSquare className="w-8 h-8 text-blue-500" />
                        Tasks & Schedule
                    </h1>
                    <p className="text-muted-foreground mt-1">Manage your follow-ups and meetings</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex bg-accent/20 p-1 rounded-xl border border-border">
                        <button onClick={() => setView('calendar')} className={`p-2 rounded-lg transition-all ${view === 'calendar' ? 'bg-blue-500/20 text-blue-500' : 'text-muted-foreground hover:text-foreground'}`}><CalendarIcon className="w-5 h-5" /></button>
                        <button onClick={() => setView('list')} className={`p-2 rounded-lg transition-all ${view === 'list' ? 'bg-blue-500/20 text-blue-500' : 'text-muted-foreground hover:text-foreground'}`}><List className="w-5 h-5" /></button>
                    </div>
                    <button onClick={openCreateModal} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl transition-all font-medium border border-blue-400/20 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                        <Plus className="w-4 h-4" /> New Task
                    </button>
                </div>
            </div>

            <div className="flex-1 glass-panel bg-card border border-border rounded-3xl p-6 overflow-hidden mt-6">
                {loading ? (
                    <div className="h-full flex items-center justify-center text-muted-foreground">Loading tasks...</div>
                ) : view === 'calendar' ? (
                    <Calendar
                        localizer={localizer}
                        events={events}
                        startAccessor="start"
                        endAccessor="end"
                        style={{ height: '100%' }}
                        components={{
                            toolbar: CustomToolbar,
                            event: CustomEvent
                        }}
                        onSelectEvent={openEditModal}
                    />
                ) : (
                    <div className="space-y-4 overflow-y-auto h-full pr-2">
                        {events.length === 0 && <p className="text-center text-muted-foreground py-10">No tasks found.</p>}
                        {events.map(event => (
                            <div key={event.id} className="bg-accent/20 border border-border p-4 rounded-xl flex justify-between items-center group hover:bg-accent/30 transition-colors cursor-pointer" onClick={() => openEditModal(event)}>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="checkbox"
                                        checked={event.status === 'done'}
                                        onChange={(e) => {
                                            e.stopPropagation();
                                            api.updateFollowUp(event.id, { status: event.status === 'done' ? 'pending' : 'done' }).then(() => mutateTasks());
                                        }}
                                        className="w-5 h-5 rounded border-muted-foreground bg-transparent text-blue-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                                    />
                                    <div>
                                        <h3 className={`font-medium transition-colors ${event.status === 'done' ? 'text-muted-foreground line-through' : 'text-foreground group-hover:text-blue-500'}`}>
                                            {event.title}
                                        </h3>
                                        <p className="text-sm text-muted-foreground">{moment(event.start).format('LLL')}</p>
                                    </div>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${event.status === 'done' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                    {event.status === 'done' ? 'Done' : 'Pending'}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={closeModal}>
                    <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-6">
                            <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                                {editId ? <Edit className="w-5 h-5 text-blue-500" /> : <Plus className="w-5 h-5 text-blue-500" />}
                                {editId ? 'Edit Task' : 'New Task'}
                            </h2>
                            <form onSubmit={handleSaveTask} className="space-y-5">
                                <div>
                                    <label className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2 block">Related Lead</label>
                                    <select
                                        className="w-full bg-input border border-border rounded-xl py-3 px-4 text-foreground focus:outline-none focus:border-blue-500/40"
                                        value={selectedLeadId}
                                        onChange={e => setSelectedLeadId(e.target.value)}
                                        required
                                        disabled={!!editId} // Cannot change lead on edit
                                    >
                                        <option value="">-- Choose Lead --</option>
                                        {leads.map(l => (
                                            <option key={l.id} value={l.id} className="bg-popover text-popover-foreground">{l.title} ({l.company})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2 block">Task Description</label>
                                    <input
                                        type="text"
                                        className="w-full bg-input border border-border rounded-xl py-3 px-4 text-foreground focus:outline-none focus:border-blue-500/40"
                                        placeholder="e.g. Call for updates"
                                        value={taskNote}
                                        onChange={e => setTaskNote(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2 block">Due Date</label>
                                        <input
                                            type="date"
                                            className="w-full bg-input border border-border rounded-xl py-3 px-4 text-foreground focus:outline-none focus:border-blue-500/40"
                                            value={taskDate}
                                            onChange={e => setTaskDate(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2 block">Type</label>
                                        <select
                                            className="w-full bg-input border border-border rounded-xl py-3 px-4 text-foreground focus:outline-none focus:border-blue-500/40"
                                            value={taskType}
                                            onChange={e => setTaskType(e.target.value)}
                                        >
                                            <option value="wa" className="bg-popover text-popover-foreground">WhatsApp</option>
                                            <option value="call" className="bg-popover text-popover-foreground">Call</option>
                                            <option value="email" className="bg-popover text-popover-foreground">Email</option>
                                            <option value="meeting" className="bg-popover text-popover-foreground">Meeting</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="flex gap-3 justify-end pt-2">
                                    {editId && (
                                        <button type="button" onClick={handleDelete} className="px-5 py-2.5 rounded-xl border border-red-500/20 text-red-500 hover:bg-red-500/10 transition-all text-sm mr-auto flex items-center gap-2">
                                            <Trash2 className="w-4 h-4" /> Delete
                                        </button>
                                    )}
                                    <button type="button" onClick={closeModal} className="px-5 py-2.5 rounded-xl border border-border text-muted-foreground hover:text-foreground transition-all text-sm">Cancel</button>
                                    <button type="submit" className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all shadow-lg shadow-blue-500/20">
                                        {editId ? 'Save Changes' : 'Create Task'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={showConfirm}
                title="Delete Task"
                message="Are you sure you want to delete this task? This action cannot be undone."
                onConfirm={executeDelete}
                onCancel={() => setShowConfirm(false)}
            />
        </div>
    );
}
