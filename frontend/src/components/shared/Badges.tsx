import React from 'react';

// ─── Score / Match Badge ────────────────────────
export function ScoreBadge({ score }: { score?: number | null }) {
    if (score === undefined || score === null) {
        return (
            <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-muted/20 text-muted-foreground border border-border uppercase tracking-wider">
                N/A
            </span>
        );
    }
    let color = 'bg-red-500/10 text-red-500 border-red-500/20';
    let label = 'Low';
    if (score >= 75) { color = 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'; label = 'High'; }
    else if (score >= 50) { color = 'bg-amber-500/10 text-amber-500 border-amber-500/20'; label = 'Mid'; }
    return (
        <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${color}`}>{label}</span>
            <span className="text-[10px] text-muted-foreground font-mono">{score}%</span>
        </div>
    );
}

// ─── Status Badge (Generic) ────────────────────────
const STATUS_COLORS: Record<string, string> = {
    'new': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    'contacted': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    'interested': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    'negotiation': 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    'won': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    'lost': 'bg-red-500/10 text-red-500 border-red-500/20',
    'rejected': 'bg-red-500/10 text-red-500 border-red-500/20',
    'draft': 'bg-muted/20 text-muted-foreground border-border',
    'active': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    'paused': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    'completed': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    'pending': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    'done': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    'skipped': 'bg-muted/20 text-muted-foreground border-border',
    'sent': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    'paid': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    'overdue': 'bg-red-500/10 text-red-500 border-red-500/20',
    'cancelled': 'bg-red-500/10 text-red-500 border-red-500/20',
    'running': 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
};

export function StatusBadge({ status }: { status: string }) {
    const color = STATUS_COLORS[status] || 'bg-muted/20 text-muted-foreground border-border';
    return (
        <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-widest ${color}`}>
            {status}
        </span>
    );
}

// ─── Source Badge (Job Lead Sources) ────────────────────────
const SOURCE_COLORS: Record<string, string> = {
    'LinkedIn': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    'Upwork': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    'Indeed': 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    'Glints': 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
    'Manual': 'bg-muted/20 text-muted-foreground border-border',
};

export function SourceBadge({ source }: { source: string }) {
    const color = SOURCE_COLORS[source] || 'bg-muted/20 text-muted-foreground border-border';
    return (
        <span className={`px-2 py-1 rounded text-[10px] font-bold border uppercase tracking-wider ${color}`}>
            {source}
        </span>
    );
}
