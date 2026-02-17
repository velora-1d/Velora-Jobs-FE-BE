'use client';

import React, { useState } from 'react';
import { api } from '@/lib/api';
import {
    Play, Square, Terminal, Settings, Shield, AlertTriangle,
    Database, Globe, Search, Download, Trash2, Linkedin, ExternalLink, Briefcase, ClipboardList, Palmtree,
    MapPinned, Building2, School, ShoppingBag, Code2, Cpu, Zap, ChevronUp, ChevronDown, MapPin, CheckSquare,
    FolderOpen, Share2, Target, Users, Loader2
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
    // 1. Google Maps (Local Business)
    {
        id: 'gmaps_biz',
        Icon: MapPin,
        label: 'Local Business',
        desc: 'UMKM, Klinik, Travel, Kontraktor, Resto, Koperasi',
        keywords: 'Klinik Kecantikan',
        location: 'Jakarta Selatan',
        sources: ['gmaps'],
        variants: ['Klinik Gigi', 'Travel Umroh', 'Kontraktor Sipil', 'Restoran Padang', 'Koperasi Simpan Pinjam', 'Sekolah Swasta'],
        color: 'from-blue-500/20 to-cyan-500/10 border-blue-500/30',
    },
    // 2. LinkedIn (Decision Makers)
    {
        id: 'linkedin_founders',
        Icon: Users,
        label: 'Decision Makers',
        desc: 'Founder, CEO, Owner, Director (Non-Job Search)',
        keywords: 'Founder',
        location: 'Indonesia',
        sources: ['linkedin'],
        variants: ['Co-founder', 'Owner', 'Director', 'Head of Operations', 'Marketing Director'],
        color: 'from-blue-700/20 to-indigo-500/10 border-blue-700/30',
    },
    // 3. Job Boards (Hiring Signals)
    {
        id: 'job_boards',
        Icon: Briefcase,
        label: 'Hiring Companies',
        desc: 'Perusahaan yang sedang merekrut (Butuh solusi)',
        keywords: 'Fullstack Developer',
        location: 'Remote',
        sources: ['linkedin', 'glints', 'jobstreet', 'indeed', 'karir'],
        variants: ['Mobile Developer', 'System Analyst', 'UI/UX Designer', 'Digital Marketing'],
        color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30',
    },
    // 4. Freelance Marketplaces
    {
        id: 'freelance',
        Icon: Globe,
        label: 'Freelance Projects',
        desc: 'Proyek lepas di Upwork, Freelancer, Projects.co.id',
        keywords: 'Web Development',
        location: 'Anywhere',
        sources: ['upwork', 'freelancer', 'sribulancer', 'projects.co.id', 'fiverr'],
        variants: ['Mobile App', 'SEO Optimization', 'Copywriting', 'Logo Design'],
        color: 'from-green-500/20 to-lime-500/10 border-green-500/30',
    },
    // 5. Agencies
    {
        id: 'agency',
        Icon: Building2,
        label: 'Agency Partner',
        desc: 'Web Agency, Digital Agency, Creative House',
        keywords: 'Digital Agency',
        location: 'Bandung',
        sources: ['gmaps', 'linkedin'],
        variants: ['Web Design Agency', 'Software House', 'Creative Agency', 'Advertising Agency'],
        color: 'from-purple-500/20 to-pink-500/10 border-purple-500/30',
    },
    // 6. Directory & Public Data
    {
        id: 'directory',
        Icon: FolderOpen,
        label: 'Directories',
        desc: 'Direktori UMKM, Asosiasi Bisnis, Listing Vendor',
        keywords: 'Daftar UMKM',
        location: 'Indonesia',
        sources: ['google'],
        variants: ['Asosiasi Pengusaha', 'Vendor List', 'Yellow Pages', 'Marketplace B2B'],
        color: 'from-amber-500/20 to-orange-500/10 border-amber-500/30',
    },
    // 7. Social Media (Local Biz)
    {
        id: 'social',
        Icon: Share2,
        label: 'Social Media',
        desc: 'Instagram Bisnis, Facebook Groups',
        keywords: 'Jual Baju Muslim',
        location: 'Instagram',
        sources: ['instagram', 'facebook'],
        variants: ['Fashion Brand', 'Kuliner Viral', 'Jasa Dekorasi', 'MUA Wedding'],
        color: 'from-rose-500/20 to-red-500/10 border-rose-500/30',
    },
    // 8. Direct Company
    {
        id: 'company',
        Icon: Target,
        label: 'Direct Company',
        desc: 'Website perusahaan langsung (Career page)',
        keywords: 'Career Page',
        location: 'Indonesia',
        sources: ['google'],
        variants: ['Lowongan Kerja Website', 'Recruitment Page', 'Join Us Page'],
        color: 'from-slate-500/20 to-gray-500/10 border-slate-500/30',
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

    // Initial check on mount
    React.useEffect(() => {
        const checkInitialStatus = async () => {
            try {
                const status = await api.getScrapeStatus();
                if (status.running) {
                    setLoading(true);
                    if (status.logs) setLogs(status.logs);
                }
            } catch (e) {
                console.error("Initial status check failed", e);
            }
        };
        checkInitialStatus();
    }, []);

    // Poll logs when loading
    React.useEffect(() => {
        let interval: NodeJS.Timeout;
        if (loading) {
            // Immediate check
            const fetchStatus = async () => {
                try {
                    const status = await api.getScrapeStatus();
                    if (status.logs) setLogs(status.logs);

                    if (!status.running) {
                        setLoading(false);
                        // Check last log for success/error
                        if (status.logs && status.logs.length > 0) {
                            const lastLog = status.logs[status.logs.length - 1];
                            if (lastLog.includes("DONE") || lastLog.includes("finished") || lastLog.includes("ended")) {
                                setResult({ message: "Scraping Process Completed." });
                            }
                        }
                    }
                } catch (e) {
                    console.error("Log polling error", e);
                }
            };

            fetchStatus();
            interval = setInterval(fetchStatus, 2000); // 2s is enough for background polling
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
        <div className="w-full h-full flex flex-col">
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-foreground tracking-tight flex items-center gap-3">
                    <Cpu className="w-8 h-8 text-blue-500 fill-blue-500/20" />
                    Scraper Command Center
                </h1>
                <p className="text-muted-foreground mt-2 text-lg">Multi-source lead extraction with live monitoring.</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 flex-1 min-h-0">
                {/* ─── LEFT COLUMN: CONTROLS ─── */}
                <div className="flex-1 space-y-8 overflow-y-auto pr-2 custom-scrollbar">

                    {/* Quick Presets */}
                    <div className="space-y-4">
                        <button
                            onClick={() => setShowPresets(!showPresets)}
                            className="flex items-center gap-2 text-xs font-mono text-muted-foreground uppercase tracking-widest hover:text-foreground transition-colors"
                        >
                            <Zap className="w-4 h-4 text-amber-500" />
                            Quick Presets
                            {showPresets ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>

                        {showPresets && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {PRESETS.map((preset) => {
                                    const PresetIcon = preset.Icon;
                                    return (
                                        <button
                                            key={preset.id}
                                            onClick={() => applyPreset(preset)}
                                            className={`text-left p-4 rounded-2xl border transition-all hover:scale-[1.02] bg-gradient-to-br ${preset.color} ${activePreset === preset.id
                                                ? 'ring-2 ring-primary/20 shadow-lg'
                                                : 'hover:shadow-md'
                                                }`}
                                        >
                                            <p className="text-foreground font-bold text-sm mb-1 flex items-center gap-2">
                                                <PresetIcon className="w-4 h-4 opacity-80" />
                                                {preset.label}
                                            </p>
                                            <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">{preset.desc}</p>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Main Form */}
                    <div className="glass-panel bg-card border border-border rounded-3xl p-8 relative overflow-hidden">
                        <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/10 blur-3xl rounded-full pointer-events-none" />

                        <form onSubmit={handleScrape} className="space-y-6 relative z-10">
                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <label className="text-xs font-mono text-muted-foreground uppercase tracking-widest ml-1 flex items-center gap-2">
                                        <Search className="w-3 h-3 text-blue-500" /> Target Keywords
                                    </label>
                                    <input
                                        type="text"
                                        value={keywords}
                                        onChange={(e) => { setKeywords(e.target.value); setActivePreset(null); }}
                                        className="w-full bg-input border border-border rounded-xl py-3 px-5 text-foreground focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-muted-foreground text-base shadow-inner"
                                        placeholder="e.g. Pesantren, Clinic"
                                        required
                                    />
                                </div>

                                <div className="space-y-3">
                                    <label className="text-xs font-mono text-muted-foreground uppercase tracking-widest ml-1 flex items-center gap-2">
                                        <MapPin className="w-3 h-3 text-cyan-500" /> Geographic Zone
                                    </label>
                                    <input
                                        type="text"
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                        className="w-full bg-input border border-border rounded-xl py-3 px-5 text-foreground focus:outline-none focus:border-cyan-500/50 transition-all placeholder:text-muted-foreground text-base shadow-inner"
                                        placeholder="e.g. Jawa Timur, Jakarta"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-3">
                                        <label className="text-xs font-mono text-muted-foreground uppercase tracking-widest ml-1 flex items-center gap-2">
                                            <Zap className="w-3 h-3 text-amber-500" /> Limit
                                        </label>
                                        <input
                                            type="number"
                                            value={limit}
                                            onChange={(e) => setLimit(parseInt(e.target.value))}
                                            className="w-full bg-input border border-border rounded-xl py-3 px-5 text-foreground focus:outline-none focus:border-amber-500/50 transition-all font-mono text-base"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-xs font-mono text-muted-foreground uppercase tracking-widest ml-1 flex items-center gap-2">
                                            <Shield className="w-3 h-3 text-emerald-500" /> Safe Mode
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => setSafeMode(!safeMode)}
                                            className={`w-full h-[50px] rounded-xl border transition-all flex items-center justify-center gap-2 ${safeMode ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500' : 'bg-input border-border text-muted-foreground'}`}
                                        >
                                            <CheckSquare className={`w-4 h-4 ${safeMode ? 'opacity-100' : 'opacity-20'}`} />
                                            <span className="text-xs font-bold uppercase tracking-wider">{safeMode ? 'ON' : 'OFF'}</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-xs font-mono text-muted-foreground uppercase tracking-widest ml-1 flex items-center gap-2">
                                        <Globe className="w-3 h-3 text-emerald-500" /> Sources
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {ALL_SOURCES.map((src) => {
                                            const isActive = selectedSources.includes(src.id);
                                            const SrcIcon = src.Icon;
                                            return (
                                                <button
                                                    key={src.id}
                                                    type="button"
                                                    onClick={() => toggleSource(src.id)}
                                                    className={`px-3 py-2 rounded-lg border transition-all text-[11px] font-bold flex items-center gap-2 ${isActive ? src.color : 'bg-accent/20 border-border text-muted-foreground'}`}
                                                >
                                                    <SrcIcon className="w-3.5 h-3.5" />
                                                    {src.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4">
                                {loading ? (
                                    <button
                                        type="button"
                                        onClick={handleStop}
                                        className="w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 bg-red-500 text-white shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all font-mono tracking-widest text-sm"
                                    >
                                        <Loader2 className="w-4 h-4 animate-spin" /> STOP SCRAPING
                                    </button>
                                ) : (
                                    <button
                                        type="submit"
                                        disabled={selectedSources.length === 0}
                                        className="w-full py-4 rounded-xl font-bold flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 disabled:opacity-50 transition-all"
                                    >
                                        <Play className="w-5 h-5 fill-current" />
                                        <span className="tracking-wide">INITIATE SCRAPE</span>
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>

                {/* ─── RIGHT COLUMN: LIVE MONITOR ─── */}
                <div className="w-full lg:w-[450px] flex flex-col min-h-[400px]">
                    <div className="sticky top-4 flex flex-col h-full max-h-[calc(100vh-180px)]">
                        <div className="flex items-center justify-between mb-3 px-1">
                            <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                <Terminal className="w-4 h-4 text-blue-500" /> Live Monitor
                            </h3>
                            {loading && (
                                <div className="flex items-center gap-2">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                    </span>
                                    <span className="text-[10px] font-mono text-emerald-500 animate-pulse">SCRAPING...</span>
                                </div>
                            )}
                        </div>

                        <div className="flex-1 bg-black border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
                            <div className="flex items-center justify-between px-4 py-2 bg-slate-900/50 border-b border-white/5">
                                <div className="flex gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/30" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/30" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/30" />
                                </div>
                                <span className="text-[10px] font-mono text-slate-500 tracking-wider">velora-scraper-v2.0</span>
                            </div>

                            <div
                                ref={logsEndRef}
                                className="p-5 overflow-y-auto font-mono text-[11px] leading-relaxed space-y-1 bg-[#0a0a0b] flex-1 custom-terminal"
                            >
                                {logs.length === 0 && !loading && (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-700 opacity-40 text-center px-4">
                                        <Terminal className="w-8 h-8 mb-2" />
                                        <p>Ready to monitor...</p>
                                        <p className="text-[9px] mt-1">Logs will appear here in real-time</p>
                                    </div>
                                )}

                                {logs.map((log, i) => {
                                    const time = log.substring(0, 10);
                                    const msg = log.substring(11);
                                    let color = "text-slate-400";
                                    if (msg.includes("ERROR") || msg.includes("❌")) color = "text-red-400";
                                    else if (msg.includes("SUCCESS") || msg.includes("🎉") || msg.includes("DONE")) color = "text-emerald-400";
                                    else if (msg.includes("Starting") || msg.includes("🚀") || msg.includes("Extracting")) color = "text-blue-400";
                                    else if (msg.includes("Found")) color = "text-amber-400";

                                    return (
                                        <div key={i} className="group flex gap-3 border-l-2 border-transparent pl-1 hover:bg-white/5 transition-colors">
                                            <span className="text-slate-600 flex-shrink-0">{time}</span>
                                            <span className={color}>{msg}</span>
                                        </div>
                                    );
                                })}

                                {loading && (
                                    <div className="text-blue-400 flex items-center gap-2 pt-2">
                                        <span className="w-1.5 h-3 bg-blue-500 animate-pulse" />
                                        <span className="animate-pulse">_</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.1); }
                
                .custom-terminal::-webkit-scrollbar { width: 6px; }
                .custom-terminal::-webkit-scrollbar-track { background: #0a0a0b; }
                .custom-terminal::-webkit-scrollbar-thumb { background: #1e1e24; border-radius: 3px; }
                .custom-terminal::-webkit-scrollbar-thumb:hover { background: #2d2d35; }
            `}</style>
        </div>
    );
}
