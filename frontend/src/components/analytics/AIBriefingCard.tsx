'use client';

import React, { useState } from 'react';
import { api, AIBriefing } from '@/lib/api';
import { Brain, Zap, RefreshCw, Sparkles } from 'lucide-react';

export default function AIBriefingCard() {
    const [briefing, setBriefing] = useState<AIBriefing | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const fetchBriefing = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await api.getAIBriefing();
            setBriefing(data);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to fetch AI briefing');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--card)] via-[var(--card)] to-purple-500/5 p-6 relative overflow-hidden">
            {/* Decorative glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl" />

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
                            <Brain className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-[var(--foreground)]">AI Mission Briefing</h3>
                            <p className="text-xs text-[var(--muted-foreground)]">Powered by DeepSeek-R1</p>
                        </div>
                    </div>
                    <button
                        onClick={fetchBriefing}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl font-medium transition-all
                            bg-gradient-to-r from-purple-500 to-blue-600 text-white hover:from-purple-600 hover:to-blue-700
                            disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/20"
                    >
                        {loading ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                            <Sparkles className="w-4 h-4" />
                        )}
                        {loading ? 'Analyzing...' : briefing ? 'Refresh' : 'Generate'}
                    </button>
                </div>

                {!briefing && !loading && !error && (
                    <div className="text-center py-8 text-[var(--muted-foreground)]">
                        <Zap className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">Click &quot;Generate&quot; to get AI strategic advice</p>
                        <p className="text-xs mt-1 opacity-60">DeepSeek-R1 will analyze your current data</p>
                    </div>
                )}

                {loading && (
                    <div className="text-center py-8">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-full border-4 border-purple-200 border-t-purple-600 animate-spin" />
                        <p className="text-sm text-[var(--muted-foreground)]">DeepSeek-R1 sedang berpikir...</p>
                    </div>
                )}

                {error && (
                    <div className="bg-red-500/10 rounded-xl p-4 text-sm text-red-500">
                        ⚠️ {error}
                    </div>
                )}

                {briefing && !loading && (
                    <div className="space-y-4">
                        <div className="bg-[var(--accent)]/30 rounded-xl p-4 border border-purple-500/10">
                            <p className="text-sm text-[var(--foreground)] leading-relaxed whitespace-pre-wrap">
                                {briefing.briefing}
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(briefing.stats).map(([key, val]) => (
                                <span key={key} className="text-xs px-3 py-1 rounded-full bg-[var(--accent)] text-[var(--muted-foreground)]">
                                    {key.replace(/_/g, ' ')}: <strong className="text-[var(--foreground)]">{val}</strong>
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
