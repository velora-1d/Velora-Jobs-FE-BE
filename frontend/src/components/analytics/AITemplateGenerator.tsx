'use client';

import React, { useState } from 'react';
import { api, AITemplate } from '@/lib/api';
import { Wand2, RefreshCw, Copy, Check } from 'lucide-react';

interface AITemplateGeneratorProps {
    onUseTemplate?: (template: string) => void;
}

export default function AITemplateGenerator({ onUseTemplate }: AITemplateGeneratorProps) {
    const [category, setCategory] = useState('Pesantren');
    const [service, setService] = useState('Aplikasi Manajemen');
    const [tone, setTone] = useState('professional');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<AITemplate | null>(null);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState('');

    const handleGenerate = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await api.generateTemplate(category, service, tone);
            setResult(data);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to generate template');
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        if (result) {
            navigator.clipboard.writeText(result.template);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
            <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                    <Wand2 className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h3 className="font-semibold text-[var(--foreground)]">AI Template Generator</h3>
                    <p className="text-xs text-[var(--muted-foreground)]">Powered by GLM-4</p>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
                <div>
                    <label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">Target</label>
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-xl bg-[var(--accent)] text-[var(--foreground)] border border-[var(--border)] outline-none"
                    >
                        <option value="Pesantren">Pesantren</option>
                        <option value="Sekolah">Sekolah</option>
                        <option value="UMKM">UMKM</option>
                        <option value="Startup">Startup</option>
                    </select>
                </div>
                <div>
                    <label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">Service</label>
                    <select
                        value={service}
                        onChange={(e) => setService(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-xl bg-[var(--accent)] text-[var(--foreground)] border border-[var(--border)] outline-none"
                    >
                        <option value="Aplikasi Manajemen">Aplikasi Manajemen</option>
                        <option value="Website Development">Website Development</option>
                        <option value="Digital Marketing">Digital Marketing</option>
                    </select>
                </div>
                <div>
                    <label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">Tone</label>
                    <select
                        value={tone}
                        onChange={(e) => setTone(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-xl bg-[var(--accent)] text-[var(--foreground)] border border-[var(--border)] outline-none"
                    >
                        <option value="professional">Professional</option>
                        <option value="casual">Casual</option>
                        <option value="friendly">Friendly</option>
                    </select>
                </div>
            </div>

            <button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full py-2.5 rounded-xl font-medium text-sm transition-all
                    bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700
                    disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20
                    flex items-center justify-center gap-2"
            >
                {loading ? (
                    <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        GLM-4 sedang menulis...
                    </>
                ) : (
                    <>
                        <Wand2 className="w-4 h-4" />
                        Generate Template
                    </>
                )}
            </button>

            {error && (
                <div className="mt-3 bg-red-500/10 rounded-xl p-3 text-sm text-red-500">
                    ⚠️ {error}
                </div>
            )}

            {result && !loading && (
                <div className="mt-4 space-y-3">
                    <div className="bg-[var(--accent)]/50 rounded-xl p-4 border border-emerald-500/10">
                        <pre className="text-sm text-[var(--foreground)] whitespace-pre-wrap font-sans leading-relaxed">
                            {result.template}
                        </pre>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleCopy}
                            className="flex-1 py-2 rounded-xl text-sm font-medium bg-[var(--accent)] text-[var(--foreground)] hover:bg-[var(--accent)]/80 transition-colors flex items-center justify-center gap-2"
                        >
                            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                            {copied ? 'Copied!' : 'Copy'}
                        </button>
                        {onUseTemplate && (
                            <button
                                onClick={() => onUseTemplate(result.template)}
                                className="flex-1 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 transition-all"
                            >
                                Use Template
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
