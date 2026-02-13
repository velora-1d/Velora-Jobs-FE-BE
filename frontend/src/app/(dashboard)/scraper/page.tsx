'use client';

import React, { useState } from 'react';
import { api } from '@/lib/api';
import {
    Search, MapPin, Play, Loader2, Cpu, Globe, CheckSquare, Square, Zap,
    ChevronDown, ChevronUp, Linkedin, Briefcase, ClipboardList, Palmtree,
    MapPinned, Building2, School, ShoppingBag, Code2
} from 'lucide-react';

// ─── Source Configuration ────────────────────────────────
const ALL_SOURCES = [
    { id: 'linkedin', label: 'LinkedIn', color: 'text-blue-400 border-blue-500/30 bg-blue-500/10', Icon: Linkedin, desc: 'International Jobs' },
    { id: 'upwork', label: 'Upwork', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10', Icon: Briefcase, desc: 'Freelance Gigs' },
    { id: 'indeed', label: 'Indeed', color: 'text-purple-400 border-purple-500/30 bg-purple-500/10', Icon: ClipboardList, desc: 'Job Boards' },
    { id: 'glints', label: 'Glints', color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10', Icon: Palmtree, desc: 'SE Asia Jobs' },
    { id: 'gmaps', label: 'Google Maps', color: 'text-red-400 border-red-500/30 bg-red-500/10', Icon: MapPinned, desc: 'Local Business' },
];

// ─── Keyword Preset Templates ────────────────────────────
const PRESETS = [
    {
        id: 'pesantren',
        Icon: Building2,
        label: 'Pesantren Hunter',
        desc: 'Cari pondok pesantren yang butuh website & sistem digital',
        keywords: 'Pondok Pesantren',
        location: 'Jawa Timur',
        sources: ['gmaps'],
        variants: ['Pondok Pesantren', 'Pesantren Modern', 'Pesantren Tahfidz', 'Madrasah Aliyah'],
        color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30',
    },
    {
        id: 'sekolah',
        Icon: School,
        label: 'Sekolah Finder',
        desc: 'Sekolah swasta, bimbel, dan lembaga kursus',
        keywords: 'Sekolah Swasta',
        location: 'Jakarta',
        sources: ['gmaps'],
        variants: ['Sekolah Swasta', 'SMA Swasta', 'Bimbel', 'Lembaga Kursus'],
        color: 'from-blue-500/20 to-indigo-500/10 border-blue-500/30',
    },
    {
        id: 'umkm',
        Icon: ShoppingBag,
        label: 'UMKM Scanner',
        desc: 'Bisnis lokal: catering, konveksi, percetakan',
        keywords: 'Catering',
        location: 'Surabaya',
        sources: ['gmaps'],
        variants: ['Catering', 'Konveksi', 'Percetakan', 'Toko Online', 'Frozen Food'],
        color: 'from-amber-500/20 to-orange-500/10 border-amber-500/30',
    },
    {
        id: 'developer',
        Icon: Code2,
        label: 'Dev Jobs',
        desc: 'Lowongan fullstack developer lokal & internasional',
        keywords: 'Fullstack Developer',
        location: 'Remote',
        sources: ['linkedin', 'upwork', 'indeed', 'glints'],
        variants: ['Fullstack Developer', 'React Developer', 'Next.js Developer', 'Laravel Developer'],
        color: 'from-violet-500/20 to-purple-500/10 border-violet-500/30',
    },
];

export default function ScraperPage() {
    const [keywords, setKeywords] = useState('Fullstack Developer');
    const [location, setLocation] = useState('Indonesia');
    const [loading, setLoading] = useState(false);
    const [limit, setLimit] = useState(10);
    const [safeMode, setSafeMode] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [selectedSources, setSelectedSources] = useState<string[]>(['linkedin', 'upwork', 'indeed', 'glints']);
    const [showPresets, setShowPresets] = useState(true);
    const [activePreset, setActivePreset] = useState<string | null>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const logsEndRef = React.useRef<HTMLDivElement>(null);

    // Auto-scroll logs
    React.useEffect(() => {
        if (logsEndRef.current) {
            logsEndRef.current.scrollTop = logsEndRef.current.scrollHeight;
        }
    }, [logs]);

    // Poll logs when loading
    React.useEffect(() => {
        let interval: NodeJS.Timeout;
        if (loading) {
            interval = setInterval(async () => {
                try {
                    const status = await api.getScrapeStatus();
                    if (status.logs) setLogs(status.logs);
                    if (!status.running && status.logs.length > 0) {
                        setLoading(false);
                        // Check last log for success/error
                        const lastLog = status.logs[status.logs.length - 1];
                        if (lastLog.includes("finished") || lastLog.includes("ended")) {
                            setResult({ message: "Scraping Process Completed." });
                        }
                    }
                } catch (e) {
                    console.error("Log polling error", e);
                }
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [loading]);

    const toggleSource = (id: string) => {
        setSelectedSources((prev) =>
            prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
        );
        setActivePreset(null);
    };

    const applyPreset = (preset: typeof PRESETS[0]) => {
        setKeywords(preset.keywords);
        setLocation(preset.location);
        setSelectedSources(preset.sources);
        setActivePreset(preset.id);
        // Default safety settings for presets
        setLimit(10);
        setSafeMode(true);
    };

    const handleStop = async () => {
        if (!confirm("Are you sure you want to stop the scraper?")) return;
        try {
            await api.stopScrape();
        } catch (e) {
            alert("Failed to stop scraper");
        }
    };

    const handleScrape = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedSources.length === 0) return;
        setLoading(true);
        setLogs([]);
        setResult(null);
        try {
            // Start the background task
            await api.startScrape(keywords, location, selectedSources, limit, safeMode);
        } catch (err) {
            alert('Connection Error');
            setLoading(false);
        }
    };

    return (
        <div className="w-full">
            <div className="mb-12">
                <h1 className="text-4xl font-bold text-white tracking-tight flex items-center gap-3">
                    <Cpu className="w-8 h-8 text-blue-400 fill-blue-400/20" />
                    Scraper Control
                </h1>
                <p className="text-slate-400 mt-2 text-lg">Multi-source lead extraction for jobs & local business.</p>
            </div>

            {/* ─── Keyword Presets ─── */}
            <div className="mb-8">
                <button
                    onClick={() => setShowPresets(!showPresets)}
                    className="flex items-center gap-2 text-sm font-mono text-slate-400 uppercase tracking-widest mb-4 hover:text-white transition-colors"
                >
                    <Zap className="w-4 h-4 text-amber-400" />
                    Quick Presets
                    {showPresets ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showPresets && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {PRESETS.map((preset) => {
                            const PresetIcon = preset.Icon;
                            return (
                                <button
                                    key={preset.id}
                                    onClick={() => applyPreset(preset)}
                                    className={`text-left p-5 rounded-2xl border transition-all hover:scale-[1.02] bg-gradient-to-br ${preset.color} ${activePreset === preset.id
                                        ? 'ring-2 ring-white/20 shadow-lg'
                                        : 'hover:shadow-md'
                                        }`}
                                >
                                    <p className="text-white font-bold text-sm mb-1 flex items-center gap-2">
                                        <PresetIcon className="w-4 h-4 opacity-80" />
                                        {preset.label}
                                    </p>
                                    <p className="text-slate-400 text-xs leading-relaxed">{preset.desc}</p>
                                    <div className="flex flex-wrap gap-1 mt-3">
                                        {preset.variants.slice(0, 3).map((v) => (
                                            <span key={v} className="text-[9px] px-2 py-0.5 rounded-full bg-black/30 text-slate-300 font-mono">
                                                {v}
                                            </span>
                                        ))}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ─── Main Form ─── */}
            <div className="glass-panel rounded-3xl p-8 md:p-12 relative overflow-hidden">
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/20 blur-3xl rounded-full pointer-events-none" />
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-cyan-500/10 blur-3xl rounded-full pointer-events-none" />

                <form onSubmit={handleScrape} className="space-y-8 relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <label className="text-xs font-mono text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <Search className="w-3 h-3 text-blue-400" /> Target Keywords
                            </label>
                            <div className="relative group">
                                <input
                                    type="text"
                                    value={keywords}
                                    onChange={(e) => { setKeywords(e.target.value); setActivePreset(null); }}
                                    className="w-full bg-[#000000]/40 border border-[#ffffff10] rounded-xl py-4 px-6 text-white focus:outline-none focus:border-blue-500/50 focus:bg-[#000000]/60 transition-all placeholder:text-slate-700 text-lg shadow-inner"
                                    placeholder="e.g. Pesantren, Fullstack Developer"
                                    required
                                />
                                <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500 group-focus-within:w-full rounded-b-xl" />
                            </div>
                            {/* Keyword variant chips */}
                            {activePreset && (
                                <div className="flex flex-wrap gap-2 pt-2">
                                    {PRESETS.find(p => p.id === activePreset)?.variants.map((v) => (
                                        <button
                                            key={v}
                                            type="button"
                                            onClick={() => setKeywords(v)}
                                            className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${keywords === v
                                                ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                                                : 'bg-[#ffffff03] border-[#ffffff08] text-slate-500 hover:text-white hover:border-[#ffffff15]'
                                                }`}
                                        >
                                            {v}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="space-y-3">
                            <label className="text-xs font-mono text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <MapPin className="w-3 h-3 text-cyan-400" /> Geographic Zone
                            </label>
                            <div className="relative group">
                                <input
                                    type="text"
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    className="w-full bg-[#000000]/40 border border-[#ffffff10] rounded-xl py-4 px-6 text-white focus:outline-none focus:border-cyan-500/50 focus:bg-[#000000]/60 transition-all placeholder:text-slate-700 text-lg shadow-inner"
                                    placeholder="e.g. Jawa Timur, Remote, Jakarta"
                                />
                                <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-500 group-focus-within:w-full rounded-b-xl" />
                            </div>
                        </div>
                    </div>

                    {/* ─── Safety & Limit Controls ─── */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <label className="text-xs font-mono text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <Zap className="w-3 h-3 text-amber-400" /> Max Leads per Source
                            </label>
                            <div className="relative group">
                                <input
                                    type="number"
                                    min="1"
                                    max="50"
                                    value={limit}
                                    onChange={(e) => setLimit(parseInt(e.target.value))}
                                    className="w-full bg-[#000000]/40 border border-[#ffffff10] rounded-xl py-4 px-6 text-white focus:outline-none focus:border-amber-500/50 focus:bg-[#000000]/60 transition-all placeholder:text-slate-700 text-lg shadow-inner font-mono"
                                    placeholder="10"
                                />
                                <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500 group-focus-within:w-full rounded-b-xl" />
                            </div>
                            <p className="text-[10px] text-slate-500 ml-1">Limit scraping to avoid detection (Recommended: 5-10)</p>
                        </div>

                        <div className="space-y-3">
                            <label className="text-xs font-mono text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <CheckSquare className="w-3 h-3 text-emerald-400" /> Safe Mode
                            </label>
                            <div
                                onClick={() => setSafeMode(!safeMode)}
                                className={`
                                    w-full h-[62px] rounded-xl border cursor-pointer transition-all px-4 flex items-center justify-between
                                    ${safeMode
                                        ? 'bg-emerald-500/10 border-emerald-500/50 text-white shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                                        : 'bg-[#000000]/40 border-[#ffffff10] text-slate-500 hover:border-[#ffffff20]'
                                    }
                                `}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-6 rounded-full relative transition-colors ${safeMode ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                                        <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${safeMode ? 'translate-x-4' : 'translate-x-0'}`} />
                                    </div>
                                    <span className="font-semibold text-sm">Human Behavior Mode</span>
                                </div>
                                {safeMode && <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded">ACTIVE</span>}
                            </div>
                            <p className="text-[10px] text-slate-500 ml-1">Adds random delays to mimic human interaction (Slower but safer)</p>
                        </div>
                    </div>

                    {/* Source Selection */}
                    <div className="space-y-3">
                        <label className="text-xs font-mono text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                            <Globe className="w-3 h-3 text-emerald-400" /> Data Sources
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                            {ALL_SOURCES.map((src) => {
                                const isActive = selectedSources.includes(src.id);
                                const SrcIcon = src.Icon;
                                return (
                                    <button
                                        key={src.id}
                                        type="button"
                                        onClick={() => toggleSource(src.id)}
                                        className={`flex flex-col items-start gap-1 px-4 py-3 rounded-xl border transition-all text-sm font-medium ${isActive
                                            ? src.color + ' shadow-lg'
                                            : 'bg-[#ffffff03] border-[#ffffff08] text-slate-600 hover:text-slate-300 hover:border-[#ffffff15]'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2 w-full">
                                            {isActive ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                                            <SrcIcon className="w-4 h-4" />
                                            <span className="font-bold">{src.label}</span>
                                        </div>
                                        <span className={`text-[10px] ml-6 ${isActive ? 'opacity-70' : 'opacity-40'}`}>{src.desc}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Removed extra closing div */}

                    <div className="pt-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="text-slate-600 text-sm font-mono space-y-1">
                            {selectedSources.includes('gmaps') && (
                                <p className="text-red-400/70 text-xs flex items-center gap-1">
                                    <MapPinned className="w-3 h-3" /> Google Maps mode: scrapes local businesses
                                </p>
                            )}
                        </div>

                        {loading ? (
                            <button
                                type="button"
                                onClick={handleStop}
                                className="px-8 py-4 rounded-xl font-bold flex items-center gap-2 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all font-mono tracking-widest text-sm"
                            >
                                <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                </span>
                                STOP SCRAPING
                            </button>
                        ) : (
                            <button
                                type="submit"
                                disabled={selectedSources.length === 0}
                                className={`
                    relative overflow-hidden group px-10 py-4 rounded-xl font-bold flex items-center justify-center gap-3 transition-all
                    ${selectedSources.length === 0
                                        ? 'bg-slate-800/50 text-slate-500 cursor-not-allowed border border-slate-700'
                                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] border border-blue-400/20'
                                    }
                  `}
                            >
                                <Play className="w-5 h-5 fill-current" />
                                <span className="tracking-wide">INITIATE SCRAPE</span>
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 pointer-events-none" />
                            </button>
                        )}
                    </div>
                </form>

                {/* ─── Live Log Terminal ─── */}
                <div className="mt-10 bg-[#0c0c0c] border border-[#ffffff10] rounded-2xl overflow-hidden shadow-2xl relative">
                    <div className="flex items-center justify-between px-4 py-2 bg-[#1a1a1a] border-b border-[#ffffff10]">
                        <div className="flex gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500/50" />
                            <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                            <div className="w-3 h-3 rounded-full bg-green-500/50" />
                        </div>
                        <span className="text-xs font-mono text-slate-500">velora-scraper-console</span>
                    </div>

                    <div
                        ref={logsEndRef}
                        className="p-6 h-[300px] overflow-y-auto font-mono text-xs md:text-sm space-y-1 relative"
                    >
                        {logs.length === 0 && !loading && (
                            <div className="absolute inset-0 flex items-center justify-center text-slate-700 pointer-events-none">
                                <span className="opacity-50">Waiting for scrape command...</span>
                            </div>
                        )}

                        {logs.map((log, i) => (
                            <div key={i} className="text-slate-300 border-l-2 border-transparent pl-2 hover:border-slate-700 hover:bg-white/5 transition-colors">
                                <span className="text-slate-600 mr-2">{log.substring(0, 10)}</span>
                                <span className={
                                    log.includes("ERROR") || log.includes("❌") ? "text-red-400" :
                                        log.includes("SUCCESS") || log.includes("🎉") ? "text-emerald-400" :
                                            log.includes("Starting") || log.includes("🚀") ? "text-blue-400" :
                                                "text-slate-300"
                                }>
                                    {log.substring(11)}
                                </span>
                            </div>
                        ))}

                        {loading && (
                            <div className="animate-pulse text-blue-400 flex items-center gap-2 mt-2">
                                <span className="w-2 h-4 bg-blue-500 block animate-blink" />
                                <span>_</span>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
