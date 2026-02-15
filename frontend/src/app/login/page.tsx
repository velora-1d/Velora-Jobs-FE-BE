'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { api } from '@/lib/api';
import { User, Lock, ArrowRight, Eye, EyeOff, Rocket, Sparkles, BarChart2, Zap, Sun, Moon, Hexagon, ShieldCheck, Globe, Users, Building2 } from 'lucide-react';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();
    const { setTheme, resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await api.login(email, password);
            router.push('/');
        } catch {
            setError('Invalid email or password');
        } finally {
            setLoading(false);
        }
    };

    // Prevent hydration mismatch for the Toggle Icon only
    // We do NOT block the whole page rendering to prevent FOUC/Layout shifts

    return (
        <div className="min-h-screen flex text-foreground overflow-hidden relative selection:bg-cyan-500/30 transition-colors duration-500 bg-slate-50 dark:bg-slate-950">
            {/* ─── DYNAMIC BACKGROUND (CSS-BASED THEMEING) ───────────────────────────── */}

            {/* Dark Mode Aurora: Visible only when .dark class is present */}
            <div className="absolute inset-0 z-0 bg-slate-950 overflow-hidden transition-opacity duration-700 opacity-0 dark:opacity-100 pointer-events-none">
                <div className="absolute -top-[50%] -left-[50%] w-[200%] h-[200%] bg-[radial-gradient(circle_farthest-corner_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950 animate-slow-spin opacity-60"></div>
                <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-cyan-900/30 via-transparent to-transparent opacity-50"></div>
                <div className="absolute bottom-0 left-0 w-full h-full bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-emerald-900/30 via-transparent to-transparent opacity-50"></div>
                <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-10"></div>
            </div>

            {/* Light Mode Mesh: Visible only when .dark class is ABSENT */}
            <div className="absolute inset-0 z-0 bg-slate-50 overflow-hidden transition-opacity duration-700 opacity-100 dark:opacity-0 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-blue-100 via-transparent to-transparent opacity-70"></div>
                <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-cyan-100 via-transparent to-transparent opacity-70"></div>
                <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,black,rgba(255,255,255,0))] opacity-[0.03]"></div>
            </div>


            {/* ─── LEFT SIDE: FEATURE SHOWCASE ─────────────────── */}
            <div className="hidden lg:flex w-1/2 relative flex-col justify-center items-center p-12 z-10 border-r border-slate-200 dark:border-white/5">
                <div className="relative z-10 max-w-lg w-full">

                    {/* Brand */}
                    <div className="mb-10">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 shadow-lg shadow-blue-500/20">
                                <Hexagon className="w-8 h-8 text-white fill-white/20" />
                            </div>
                            <div>
                                <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">Velora Jobs</h1>
                                <p className="text-slate-500 dark:text-white/60 text-sm font-medium tracking-wide mt-1">INTELLIGENT ACQUISITION OS</p>
                            </div>
                        </div>
                        <p className="text-lg text-slate-600 dark:text-white/80 leading-relaxed font-light">
                            Platform <span className="font-semibold text-blue-600 dark:text-cyan-400">#1</span> untuk otomatisasi pencarian klien.
                            Gabungan kekuatan Auto-Scraping, AI Scoring, dan Human-Like Outreach dalam satu dashboard.
                        </p>
                    </div>

                    {/* Features Grid */}
                    <div className="grid grid-cols-1 gap-4 mb-10">
                        <FeatureRow
                            icon={<Rocket className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
                            title="Unlimited Auto Scraper"
                            desc="Extract ribuan data leads dari LinkedIn & GMaps tanpa batas harian."
                        />
                        <FeatureRow
                            icon={<Sparkles className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />}
                            title="AI Lead Scoring (98% Akurasi)"
                            desc="Filter otomatis mana leads yang 'hot' dan siap closing."
                        />
                        <FeatureRow
                            icon={<Zap className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
                            title="Safe WhatsApp Blasting"
                            desc="Kirim pesan massal aman blokir dengan algoritma jeda acak."
                        />
                    </div>

                    {/* Stats / Trust */}
                    <div className="grid grid-cols-3 gap-4 pt-8 border-t border-slate-200 dark:border-white/10">
                        <StatItem label="Leads Generated" value="10k+" icon={<Users className="w-4 h-4" />} />
                        <StatItem label="System Uptime" value="99.9%" icon={<ShieldCheck className="w-4 h-4" />} />
                        <StatItem label="Trusted Companies" value="50+" icon={<Building2 className="w-4 h-4" />} />
                    </div>
                </div>
            </div>

            {/* ─── RIGHT SIDE: LOGIN FORM ──────────────────────── */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 z-10 bg-white/50 dark:bg-transparent backdrop-blur-sm lg:backdrop-blur-none transition-colors duration-500">
                {/* Theme Toggle */}
                <button
                    onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                    className="absolute top-8 right-8 p-3 rounded-full bg-slate-200/50 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-700 dark:text-white/70 hover:bg-slate-300 dark:hover:bg-white/10 transition-all"
                >
                    {/* Use mounted check to avoid hydration mismatch on icon */}
                    {mounted ? (
                        resolvedTheme === 'light' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />
                    ) : (
                        <div className="w-5 h-5" /> // Placeholder to prevent layout shift
                    )}
                </button>

                <div className="w-full max-w-md relative">
                    {/* Glassmorphic Card */}
                    <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-cyan-500/5 rounded-3xl blur-2xl transform scale-110"></div>

                    <div className="bg-white/80 dark:bg-slate-900/50 backdrop-blur-xl border border-white/20 dark:border-white/10 p-8 md:p-10 rounded-3xl shadow-2xl dark:shadow-[0_0_50px_rgba(0,0,0,0.5)] shadow-slate-200/50 relative overflow-hidden transition-all duration-300">

                        {/* Header */}
                        <div className="mb-8">
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Welcome Back</h2>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">Masuk untuk mengelola campaign Anda.</p>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-6">
                            {/* Email Input */}
                            <div className="space-y-2 relative group">
                                <label className="text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 ml-1 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors">Email Address</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/20 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:bg-white dark:focus:bg-black/60 transition-all"
                                        placeholder="email@company.com"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Password Input */}
                            <div className="space-y-2 relative group">
                                <label className="text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 ml-1 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors">Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl py-3.5 pl-12 pr-12 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/20 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:bg-white dark:focus:bg-black/60 transition-all"
                                        placeholder="••••••••"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors focus:outline-none"
                                        tabIndex={-1}
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            {error && (
                                <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm text-center animate-shake font-medium">
                                    {error}
                                </div>
                            )}

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold py-4 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-blue-500/30 flex justify-center items-center gap-2 group relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 pointer-events-none"></div>
                                {loading ? (
                                    <span className="animate-pulse">Accessing System...</span>
                                ) : (
                                    <>
                                        Sign In
                                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                    <p className="mt-8 text-center text-slate-400 dark:text-white/30 text-xs">
                        &copy; 2026 Velora Intelligent Systems. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    );
}

function FeatureRow({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
    return (
        <div className="flex gap-4 p-4 rounded-2xl bg-white/60 dark:bg-white/5 border border-slate-100 dark:border-white/5 hover:bg-white/80 dark:hover:bg-white/10 transition-all hover:scale-[1.01] cursor-default shadow-sm dark:shadow-none">
            <div className="shrink-0 pt-1">
                {icon}
            </div>
            <div>
                <h3 className="font-bold text-slate-800 dark:text-white text-base mb-1">{title}</h3>
                <p className="text-slate-500 dark:text-white/60 text-sm leading-relaxed">{desc}</p>
            </div>
        </div>
    );
}

function StatItem({ label, value, icon }: { label: string, value: string, icon: React.ReactNode }) {
    return (
        <div className="flex flex-col items-center text-center p-2">
            <div className="mb-2 text-slate-400 dark:text-white/40">{icon}</div>
            <div className="font-bold text-xl text-slate-800 dark:text-white">{value}</div>
            <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 dark:text-white/40">{label}</div>
        </div>
    );
}
