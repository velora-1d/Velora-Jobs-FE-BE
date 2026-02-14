'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Database, Search, Settings, LogOut, Hexagon, GitBranch, Calendar, Send, FileText } from 'lucide-react';

const navItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Scraper', href: '/scraper', icon: Search },
    { name: 'Leads', href: '/leads', icon: Database },
    { name: 'Pipeline', href: '/pipeline', icon: GitBranch },
    { name: 'Tasks', href: '/tasks', icon: Calendar },
    { name: 'Campaigns', href: '/campaigns', icon: Send },
    { name: 'Documents', href: '/documents', icon: FileText },
    { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="fixed left-0 top-0 h-screen w-20 lg:w-64 bg-black/50 backdrop-blur-xl border-r border-[#ffffff08] flex flex-col items-center lg:items-start py-8 z-50 transition-all duration-300">
            {/* Logo */}
            <div className="mb-12 px-6 flex items-center gap-3 group cursor-pointer w-full justify-center lg:justify-start">
                <div className="relative shrink-0">
                    <Hexagon className="w-8 h-8 text-cyan-400 fill-cyan-400/10 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)] transition-all group-hover:drop-shadow-[0_0_25px_rgba(34,211,238,0.8)]" />
                    <div className="absolute inset-0 bg-cyan-400/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <span className="hidden lg:block text-xl font-bold font-mono tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400 whitespace-nowrap">
                    VELORA
                </span>
            </div>

            {/* Nav Link */}
            <nav className="flex-1 w-full px-3 space-y-2">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`
                relative group flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300
                ${isActive
                                    ? 'bg-blue-500/10 text-cyan-400 border border-blue-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]'
                                    : 'border border-transparent text-slate-500 hover:text-slate-200 hover:bg-[#ffffff05]'
                                }
              `}
                        >
                            <div className={`relative p-1 rounded-lg transition-all ${isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:scale-110'}`}>
                                <Icon className={`w-5 h-5 ${isActive ? 'drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]' : ''}`} />
                            </div>

                            <span className={`hidden lg:block text-sm font-medium tracking-wide ${isActive ? 'text-cyan-100' : ''}`}>
                                {item.name}
                            </span>

                            {isActive && (
                                <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)] hidden lg:block" />
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Logout */}
            <div className="mt-auto px-3 w-full">
                <button
                    onClick={() => {
                        localStorage.removeItem('token');
                        window.location.href = '/login';
                    }}
                    className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-slate-600 hover:text-red-400 hover:bg-red-500/5 transition-all group border border-transparent hover:border-red-500/10"
                >
                    <LogOut className="w-5 h-5 shrink-0 group-hover:drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]" />
                    <span className="hidden lg:block text-sm font-medium">Log Out</span>
                </button>
            </div>
        </aside>
    );
}
