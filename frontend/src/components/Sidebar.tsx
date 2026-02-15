'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { LayoutDashboard, Database, Search, Settings, LogOut, Hexagon, GitBranch, Calendar, Send, FileText, Sun, Moon, Monitor } from 'lucide-react';
import { WhatsAppIcon } from './ui/WhatsAppIcon';

const navItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Scraper', href: '/scraper', icon: Search },
    { name: 'Leads', href: '/leads', icon: Database },
    { name: 'Pipeline', href: '/pipeline', icon: GitBranch },
    { name: 'Tasks', href: '/tasks', icon: Calendar },
    { name: 'Campaigns', href: '/campaigns', icon: WhatsAppIcon },
    { name: 'Documents', href: '/documents', icon: FileText },
    { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Sidebar() {
    const pathname = usePathname();
    const { setTheme, theme } = useTheme();
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <aside className="fixed left-0 top-0 h-screen w-20 lg:w-64 bg-sidebar/80 backdrop-blur-xl border-r border-sidebar-border flex flex-col items-center lg:items-start py-8 z-50 transition-all duration-300">
            {/* Logo */}
            <div className="mb-12 px-6 flex items-center gap-3 group cursor-pointer w-full justify-center lg:justify-start">
                <div className="relative shrink-0">
                    <Hexagon className="w-8 h-8 text-primary fill-primary/10 drop-shadow-[0_0_15px_color-mix(in_srgb,var(--primary),transparent_50%)] transition-all group-hover:drop-shadow-[0_0_25px_color-mix(in_srgb,var(--primary),transparent_20%)]" />
                    <div className="absolute inset-0 bg-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <span className="hidden lg:block text-xl font-bold font-mono tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/50 whitespace-nowrap">
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
                                    ? 'bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_color-mix(in_srgb,var(--primary),transparent_90%)]'
                                    : 'border border-transparent text-muted-foreground hover:text-foreground hover:bg-accent'
                                }
              `}
                        >
                            <div className={`relative p-1 rounded-lg transition-all ${isActive ? 'text-primary' : 'text-muted-foreground group-hover:scale-110'}`}>
                                <Icon className={`w-5 h-5 ${isActive ? 'drop-shadow-[0_0_8px_color-mix(in_srgb,var(--primary),transparent_50%)]' : ''}`} />
                            </div>

                            <span className={`hidden lg:block text-sm font-medium tracking-wide ${isActive ? 'text-primary-foreground dark:text-primary' : ''}`}>
                                {item.name}
                            </span>

                            {isActive && (
                                <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_10px_color-mix(in_srgb,var(--primary),transparent_20%)] hidden lg:block" />
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Theme Toggle & Logout */}
            <div className="mt-auto px-3 w-full space-y-2">
                <div className="hidden lg:flex p-1 bg-accent/50 rounded-lg border border-border justify-between">
                    <button onClick={() => setTheme('light')} className={`p-2 rounded-md transition-all ${mounted && theme === 'light' ? 'bg-background shadow text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                        <Sun className="w-4 h-4" />
                    </button>
                    <button onClick={() => setTheme('system')} className={`p-2 rounded-md transition-all ${mounted && theme === 'system' ? 'bg-background shadow text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                        <Monitor className="w-4 h-4" />
                    </button>
                    <button onClick={() => setTheme('dark')} className={`p-2 rounded-md transition-all ${mounted && theme === 'dark' ? 'bg-background shadow text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                        <Moon className="w-4 h-4" />
                    </button>
                </div>

                <div className="lg:hidden flex justify-center pb-4">
                    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-3 rounded-xl bg-accent text-muted-foreground">
                        {mounted && theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </button>
                </div>

                <button
                    onClick={() => {
                        localStorage.removeItem('token');
                        window.location.href = '/login';
                    }}
                    className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all group border border-transparent hover:border-destructive/10"
                >
                    <LogOut className="w-5 h-5 shrink-0 group-hover:drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]" />
                    <span className="hidden lg:block text-sm font-medium">Log Out</span>
                </button>
            </div>
        </aside>
    );
}
