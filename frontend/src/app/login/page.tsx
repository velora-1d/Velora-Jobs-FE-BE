'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import LoginScene from '@/components/canvas/LoginScene';
import { api } from '@/lib/api';
import { User, Lock, ArrowRight, Eye, EyeOff, Rocket, Sparkles, BarChart2, Zap } from 'lucide-react';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await api.login(email, password);
            router.push('/');
        } catch (err) {
            setError('Invalid email or password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-[#0f172a] text-white overflow-hidden">
            {/* Left Side - Visuals */}
            <div className="hidden lg:flex w-1/2 relative flex-col justify-center items-center p-12 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-r border-slate-700/50">
                <LoginScene />

                <div className="relative z-10 text-center max-w-lg backdrop-blur-sm bg-slate-900/30 p-8 rounded-2xl border border-slate-700/30 shadow-2xl">
                    <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent drop-shadow-lg">
                        Velora Jobs
                    </h1>
                    <p className="text-slate-300 text-lg mb-8 leading-relaxed">
                        Automated Client Acquisition System powered by AI.
                        Streamline your outreach and find high-quality leads effortlessly.
                    </p>

                    <div className="grid grid-cols-2 gap-4 text-left">
                        <FeatureCard
                            icon={<Rocket className="w-6 h-6 text-blue-400" />}
                            title="Auto Scraper"
                            desc="LinkedIn Integration"
                        />
                        <FeatureCard
                            icon={<Sparkles className="w-6 h-6 text-cyan-400" />}
                            title="AI Match"
                            desc="Smart Filtering"
                        />
                        <FeatureCard
                            icon={<BarChart2 className="w-6 h-6 text-emerald-400" />}
                            title="Analytics"
                            desc="Real-time Insights"
                        />
                        <FeatureCard
                            icon={<Zap className="w-6 h-6 text-amber-400" />}
                            title="Fast Outreach"
                            desc="One-click Apply"
                        />
                    </div>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-[#0f172a]">
                <div className="w-full max-w-md">
                    <div className="mb-8 text-center lg:text-left">
                        <h2 className="text-3xl font-bold text-slate-100 mb-2">Welcome Back</h2>
                        <p className="text-slate-400">Please access your dashboard using your credentials.</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300 ml-1">Email Address</label>
                            <div className="relative group">
                                <User className="absolute left-3 top-3 w-5 h-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-[#1e293b] border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600"
                                    placeholder="your@email.com"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300 ml-1">Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-[#1e293b] border border-slate-700 rounded-xl py-3 pl-10 pr-12 text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600"
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 transition-colors focus:outline-none"
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl text-sm text-center">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold py-3.5 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-blue-500/20 flex justify-center items-center gap-2 group"
                        >
                            {loading ? (
                                <span className="animate-pulse">Authenticating...</span>
                            ) : (
                                <>
                                    Sign In to Dashboard
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <p className="mt-8 text-center text-slate-500 text-sm">
                        Powered by <span className="text-slate-300 font-medium">Velora Intelligent Systems</span>
                    </p>
                </div>
            </div>
        </div>
    );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
    return (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/40 border border-slate-700/30 hover:bg-slate-800/60 transition-colors">
            <span className="mt-1">{icon}</span>
            <div>
                <h3 className="font-semibold text-slate-200 text-sm">{title}</h3>
                <p className="text-slate-400 text-xs">{desc}</p>
            </div>
        </div>
    );
}
