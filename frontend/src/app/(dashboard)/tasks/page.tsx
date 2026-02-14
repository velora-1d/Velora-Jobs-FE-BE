'use client';

import React, { useState } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Plus, List, Calendar as CalendarIcon, CheckSquare } from 'lucide-react';

const localizer = momentLocalizer(moment);

// Mock Data
const MOCK_EVENTS = [
    {
        id: 1,
        title: 'Call PT Sejahtera - Follow up',
        start: new Date(new Date().setHours(10, 0, 0)),
        end: new Date(new Date().setHours(11, 0, 0)),
        resource: 'high',
    },
    {
        id: 2,
        title: 'Meeting with Budi (Cv Maju)',
        start: new Date(new Date().setDate(new Date().getDate() + 1)),
        end: new Date(new Date().setDate(new Date().getDate() + 1)),
        allDay: true,
        resource: 'mid',
    }
];

export default function TasksPage() {
    const [view, setView] = useState<'calendar' | 'list'>('calendar');
    const [events, setEvents] = useState(MOCK_EVENTS);

    return (
        <div className="w-full h-[calc(100vh-8rem)] flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                        <CheckSquare className="w-8 h-8 text-blue-400" />
                        Tasks & Schedule
                    </h1>
                    <p className="text-slate-400 mt-1">Manage your follow-ups and meetings</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex bg-[#ffffff05] p-1 rounded-xl border border-[#ffffff08]">
                        <button
                            onClick={() => setView('calendar')}
                            className={`p-2 rounded-lg transition-all ${view === 'calendar' ? 'bg-blue-500/20 text-blue-400' : 'text-slate-500 hover:text-white'}`}
                        >
                            <CalendarIcon className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setView('list')}
                            className={`p-2 rounded-lg transition-all ${view === 'list' ? 'bg-blue-500/20 text-blue-400' : 'text-slate-500 hover:text-white'}`}
                        >
                            <List className="w-5 h-5" />
                        </button>
                    </div>
                    <button className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl transition-all font-medium border border-blue-400/20 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                        <Plus className="w-4 h-4" /> New Task
                    </button>
                </div>
            </div>

            <div className="flex-1 glass-panel rounded-3xl p-6 overflow-hidden">
                {view === 'calendar' ? (
                    <Calendar
                        localizer={localizer}
                        events={events}
                        startAccessor="start"
                        endAccessor="end"
                        style={{ height: '100%' }}
                        className="text-slate-300 font-sans"
                        eventPropGetter={(event) => ({
                            style: {
                                backgroundColor: event.resource === 'high' ? '#10b981' : '#3b82f6',
                                borderRadius: '6px',
                                border: 'none',
                                opacity: 0.8
                            }
                        })}
                    />
                ) : (
                    <div className="space-y-4 overflow-y-auto h-full pr-2">
                        {events.map(event => (
                            <div key={event.id} className="bg-[#ffffff03] border border-[#ffffff05] p-4 rounded-xl flex justify-between items-center group hover:bg-[#ffffff05] transition-colors">
                                <div className="flex items-center gap-4">
                                    <input type="checkbox" className="w-5 h-5 rounded border-slate-600 bg-transparent text-blue-500 focus:ring-0 focus:ring-offset-0" />
                                    <div>
                                        <h3 className="font-medium text-slate-200 group-hover:text-blue-400 transition-colors">{event.title}</h3>
                                        <p className="text-sm text-slate-500">{moment(event.start).format('LLL')}</p>
                                    </div>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${event.resource === 'high' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                    {event.resource === 'high' ? 'High Priority' : 'Normal'}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
