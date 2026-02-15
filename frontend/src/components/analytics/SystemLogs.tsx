'use client';

import React from 'react';
import useSWR from 'swr';
import { api, ActivityLog } from '@/lib/api';
import { ScrollText, Brain, Zap, Send, Server, Search } from 'lucide-react';

const categoryIcons: Record<string, React.ReactNode> = {
    ai_scoring: <Brain className="w-4 h-4 text-purple-500" />,
    campaign: <Send className="w-4 h-4 text-blue-500" />,
    scraper: <Zap className="w-4 h-4 text-amber-500" />,
    system: <Server className="w-4 h-4 text-gray-500" />,
    enrichment: <Search className="w-4 h-4 text-emerald-500" />,
};

const levelColors: Record<string, string> = {
    info: 'bg-blue-500/10 text-blue-500',
    warning: 'bg-amber-500/10 text-amber-500',
    error: 'bg-red-500/10 text-red-500',
};

function timeAgo(dateStr: string): string {
    const now = new Date();
    const d = new Date(dateStr);
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

interface SystemLogsProps {
    limit?: number;
}

export default function SystemLogs({ limit = 20 }: SystemLogsProps) {
    const { data: logs, error } = useSWR<ActivityLog[]>(
        'activity-logs',
        () => api.getActivityLogs(limit),
        { refreshInterval: 15000 }
    );

    return (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-500 to-slate-700 flex items-center justify-center">
                    <ScrollText className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h3 className="font-semibold text-[var(--foreground)]">System Logs</h3>
                    <p className="text-xs text-[var(--muted-foreground)]">AI & Automation Activity</p>
                </div>
            </div>

            {error && (
                <div className="text-sm text-red-500 mb-3">Failed to load logs</div>
            )}

            <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                {(!logs || logs.length === 0) && !error && (
                    <div className="text-center py-8 text-[var(--muted-foreground)]">
                        <ScrollText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No activity logs yet</p>
                        <p className="text-xs mt-1 opacity-60">Logs will appear after AI operations</p>
                    </div>
                )}

                {logs?.map((log) => (
                    <div
                        key={log.id}
                        className="flex items-start gap-3 p-3 rounded-xl hover:bg-[var(--accent)]/50 transition-colors group"
                    >
                        <div className="mt-0.5">
                            {categoryIcons[log.category] || <Server className="w-4 h-4 text-gray-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm text-[var(--foreground)] truncate">{log.message}</p>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${levelColors[log.level] || 'bg-gray-500/10 text-gray-500'}`}>
                                    {log.level.toUpperCase()}
                                </span>
                                <span className="text-[10px] text-[var(--muted-foreground)]">
                                    {log.category}
                                </span>
                            </div>
                        </div>
                        <span className="text-[10px] text-[var(--muted-foreground)] whitespace-nowrap mt-1">
                            {timeAgo(log.created_at)}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
