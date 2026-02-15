'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Save, User, Key, Bell, Check, Loader2, Settings as SettingsIcon, CheckCircle2, Send, Mail, Smartphone } from 'lucide-react';

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('account');

    return (
        <div className="w-full">
            <div className="mb-12">
                <h1 className="text-4xl font-bold text-foreground tracking-tight flex items-center gap-3">
                    <SettingsIcon className="w-8 h-8 text-amber-500 fill-amber-500/20" />
                    System Config
                </h1>
                <p className="text-muted-foreground mt-2 text-lg">Manage protocols and user preferences.</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                <div className="w-full lg:w-72 space-y-2">
                    <TabButton active={activeTab === 'account'} onClick={() => setActiveTab('account')} icon={<User className="w-4 h-4" />} label="User Protocol" />
                    <TabButton active={activeTab === 'api'} onClick={() => setActiveTab('api')} icon={<Key className="w-4 h-4" />} label="API Handshake" />
                    <TabButton active={activeTab === 'notifications'} onClick={() => setActiveTab('notifications')} icon={<Bell className="w-4 h-4" />} label="Alert Signals" />
                </div>

                <div className="flex-1 glass-panel bg-card border border-border rounded-3xl p-8 lg:p-12 relative overflow-hidden min-h-[600px]">
                    <div className="absolute top-0 right-0 w-full h-[1px] bg-gradient-to-l from-amber-500/50 to-transparent" />
                    {activeTab === 'account' && <AccountSettings />}
                    {activeTab === 'api' && <APISettings />}
                    {activeTab === 'notifications' && <NotificationSettings />}
                </div>
            </div>
        </div>
    );
}

function TabButton({ active, onClick, icon, label }: any) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-4 px-6 py-4 rounded-xl transition-all duration-300 group border text-sm font-medium tracking-wide uppercase ${active
                ? 'bg-gradient-to-r from-blue-900/20 to-transparent border-blue-500/30 text-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.1)]'
                : 'bg-transparent border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/20'
                }`}
        >
            <span className={`p-2 rounded-lg ${active ? 'bg-blue-500/20 text-blue-500' : 'bg-accent/30 text-muted-foreground group-hover:text-foreground'}`}>{icon}</span>
            {label}
            {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />}
        </button>
    );
}

function AccountSettings() {
    return (
        <div className="space-y-10">
            <div>
                <h3 className="text-lg font-bold text-foreground mb-6 flex items-center gap-3">
                    <span className="w-1 h-6 bg-blue-500 rounded-full" /> Identity Definitions
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <InputGroup label="Display Name" placeholder="Admin User" defaultValue="Admin User" />
                    <InputGroup label="Comms ID (Email)" placeholder="email.jobs@velora.com" defaultValue="email.jobs@velora.com" disabled />
                </div>
            </div>

            <div>
                <h3 className="text-lg font-bold text-foreground mb-6 flex items-center gap-3">
                    <span className="w-1 h-6 bg-rose-500 rounded-full" /> Security Clearance
                </h3>
                <div className="space-y-6 max-w-md">
                    <InputGroup label="Current Passphrase" type="password" placeholder="••••••••" />
                    <InputGroup label="New Passphrase" type="password" placeholder="••••••••" />
                    <button className="mt-4 px-8 py-3 bg-accent/20 border border-border hover:bg-accent/30 text-muted-foreground hover:text-foreground rounded-xl font-medium transition-all text-sm uppercase tracking-wide flex items-center gap-2">
                        <Save className="w-4 h-4" /> Update Credentials
                    </button>
                </div>
            </div>
        </div>
    );
}

function APISettings() {
    const [openaiKey, setOpenaiKey] = useState('');
    const [openaiModel, setOpenaiModel] = useState('gpt-3.5-turbo');
    const [proxyUrl, setProxyUrl] = useState('');
    const [linkedinCookie, setLinkedinCookie] = useState('');
    const [fonnteToken, setFonnteToken] = useState('');
    const [isAiManaged, setIsAiManaged] = useState(false);
    const [isWaManaged, setIsWaManaged] = useState(false);
    const [isProxyManaged, setIsProxyManaged] = useState(false);
    const [tgStatus, setTgStatus] = useState<string | null>(null);
    const [tgTesting, setTgTesting] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getSettings().then((data: any) => {
            setOpenaiKey(data.openai_api_key || '');
            setOpenaiModel(data.openai_model || 'gpt-3.5-turbo');
            setProxyUrl(data.proxy_url || '');
            setLinkedinCookie(data.linkedin_cookie || '');
            setFonnteToken(data.fonnte_token || '');
            setIsAiManaged(data.is_ai_managed || false);
            setIsWaManaged(data.is_wa_managed || false);
            setIsProxyManaged(data.is_proxy_managed || false);
            setLoading(false);
        });
    }, []);

    const handleSave = async () => {
        setSaving(true);
        setSaved(false);
        try {
            await api.saveSettings({
                linkedin_cookie: linkedinCookie,
                // These are now managed by system, but we send them if not managed
                ...(!isAiManaged && { openai_api_key: openaiKey, openai_model: openaiModel }),
                ...(!isProxyManaged && { proxy_url: proxyUrl }),
                ...(!isWaManaged && { fonnte_token: fonnteToken }),
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin mr-3" />
                <span className="font-mono text-sm tracking-wider">LOADING CONFIGURATION...</span>
            </div>
        );
    }

    return (
        <div className="space-y-10">
            <div>
                <h3 className="text-lg font-bold text-foreground mb-6 flex items-center gap-3">
                    <span className="w-1 h-6 bg-amber-500 rounded-full" /> External Intelligence (AI)
                </h3>
                <div className="p-4 rounded-xl border border-border bg-accent/20 flex items-center justify-between">
                    <div>
                        <p className="text-foreground font-medium">AI Scoring Engine</p>
                        <p className="text-muted-foreground text-sm">Managed by System (.env)</p>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-lg text-xs font-bold border border-emerald-500/20">
                        <Check className="w-3 h-3" /> ACTIVE
                    </div>
                </div>
            </div>

            <div>
                <h3 className="text-lg font-bold text-foreground mb-6 flex items-center gap-3">
                    <span className="w-1 h-6 bg-blue-500 rounded-full" /> LinkedIn Authentication
                </h3>
                <p className="text-muted-foreground text-sm mb-6 bg-accent/20 p-4 rounded-xl border border-border">
                    Required for high-quality scraping. Paste your <code className="text-blue-500">li_at</code> cookie from a Firefox/Chrome session.
                </p>
                <div className="space-y-6">
                    <InputGroup label="li_at Cookie" type="password" placeholder="AQED..." value={linkedinCookie} onChange={setLinkedinCookie} />
                </div>
            </div>

            <div>
                <h3 className="text-lg font-bold text-foreground mb-6 flex items-center gap-3">
                    <span className="w-1 h-6 bg-muted-foreground rounded-full" /> Network & WhatsApp
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border border-border bg-accent/20 flex items-center justify-between">
                        <div>
                            <p className="text-foreground font-medium">Network Proxy</p>
                            <p className="text-muted-foreground text-sm">Static Config (.env)</p>
                        </div>
                        <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="p-4 rounded-xl border border-border bg-accent/20 flex items-center justify-between">
                        <div>
                            <p className="text-foreground font-medium">WA Gateway</p>
                            <p className="text-muted-foreground text-sm">Fonnte Integration</p>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-lg text-xs font-bold border border-emerald-500/20">
                            CONNECTED
                        </div>
                    </div>
                </div>
            </div>

            <div>
                <h3 className="text-lg font-bold text-foreground mb-6 flex items-center gap-3">
                    <span className="w-1 h-6 bg-blue-500 rounded-full" /> Telegram Notifications
                </h3>
                <p className="text-muted-foreground text-sm mb-6 bg-accent/20 p-4 rounded-xl border border-border">
                    Set <code className="text-blue-500">TELEGRAM_BOT_TOKEN</code> and <code className="text-blue-500">TELEGRAM_CHAT_ID</code> in <code className="text-blue-500">backend/.env</code> to enable notifications.
                    Create a bot via <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">@BotFather</a> on Telegram.
                </p>
                <button
                    onClick={async () => {
                        setTgTesting(true); setTgStatus(null);
                        try {
                            const res = await api.testTelegram();
                            setTgStatus(res.success ? '✅ Telegram connected!' : `❌ ${res.error}`);
                        } catch { setTgStatus('❌ Connection failed'); }
                        finally { setTgTesting(false); }
                    }}
                    disabled={tgTesting}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all disabled:opacity-50"
                >
                    {tgTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Test Notification
                </button>
                {tgStatus && <p className="mt-3 text-sm">{tgStatus}</p>}
            </div>

            <div className="pt-8 border-t border-border">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className={`px-8 py-4 rounded-xl font-bold flex items-center gap-3 transition-all ${saved
                        ? 'bg-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                        : saving
                            ? 'bg-muted text-muted-foreground cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:scale-105'
                        }`}
                >
                    {saved ? (
                        <><Check className="w-5 h-5" /> SAVED</>
                    ) : saving ? (
                        <><Loader2 className="w-5 h-5 animate-spin" /> SAVING...</>
                    ) : (
                        <><Save className="w-5 h-5" /> SAVE CONFIGURATION</>
                    )}
                </button>
            </div>
        </div >
    );
}

function NotificationSettings() {
    const [emailAlerts, setEmailAlerts] = useState(true);
    const [browserPush, setBrowserPush] = useState(false);
    const [user, setUser] = useState<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
    const [waLink, setWaLink] = useState(true);

    useEffect(() => {
        api.getSettings().then((data) => {
            setEmailAlerts(data.notify_email !== 'false');
            setBrowserPush(data.notify_push === 'true');
        });
    }, []);

    const handleToggle = async (key: string, value: boolean, setter: (v: boolean) => void) => {
        setter(value);
        await api.saveSettings({ [key]: String(value) });
    };

    return (
        <div className="space-y-10">
            <div>
                <h3 className="text-lg font-bold text-foreground mb-6 flex items-center gap-3">
                    <span className="w-1 h-6 bg-blue-500 rounded-full" /> Alert Channels
                </h3>

                <div className="space-y-4">
                    <ToggleRow
                        icon={<Mail className="w-6 h-6" />}
                        iconColor="bg-blue-500/10 text-blue-500"
                        title="Email Broadcasts"
                        subtitle="Receive daily digests of new leads."
                        value={emailAlerts}
                        onToggle={(v: boolean) => handleToggle('notify_email', v, setEmailAlerts)}
                        color="bg-blue-600"
                    />
                    <ToggleRow
                        icon={<Bell className="w-6 h-6" />}
                        iconColor="bg-amber-500/10 text-amber-500"
                        title="System Push"
                        subtitle="Real-time browser notifications."
                        value={browserPush}
                        onToggle={(v: boolean) => handleToggle('notify_push', v, setBrowserPush)}
                        color="bg-blue-600"
                    />
                    <ToggleRow
                        icon={<Smartphone className="w-6 h-6" />}
                        iconColor="bg-emerald-500/10 text-emerald-500"
                        title="WhatsApp Bridge"
                        subtitle="Enable direct chat links in Leads table."
                        value={waLink}
                        onToggle={(v: boolean) => handleToggle('notify_wa', v, setWaLink)}
                        color="bg-emerald-500"
                    />
                </div>
            </div>
        </div>
    );
}

function ToggleRow({ icon, iconColor, title, subtitle, value, onToggle, color }: any) {
    return (
        <div className="flex items-center justify-between p-6 bg-accent/20 border border-border rounded-2xl group hover:border-foreground/20 transition-all">
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${iconColor}`}>{icon}</div>
                <div>
                    <p className="text-foreground font-medium">{title}</p>
                    <p className="text-muted-foreground text-xs mt-1">{subtitle}</p>
                </div>
            </div>
            <button
                onClick={() => onToggle(!value)}
                className={`w-14 h-8 rounded-full transition-colors relative ${value ? color : 'bg-muted'}`}
            >
                <div className={`w-6 h-6 bg-background rounded-full absolute top-1 transition-all shadow-md ${value ? 'left-7' : 'left-1'}`} />
            </button>
        </div>
    );
}

function InputGroup({ label, type = "text", placeholder, defaultValue, disabled, value, onChange }: any) {
    return (
        <div className="space-y-2 group">
            <label className="text-xs font-mono text-muted-foreground uppercase tracking-widest ml-1 group-focus-within:text-blue-500 transition-colors">{label}</label>
            <input
                type={type}
                className={`w-full bg-input border border-border rounded-xl px-5 py-4 text-foreground focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-muted-foreground ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                placeholder={placeholder}
                value={value !== undefined ? value : undefined}
                defaultValue={value === undefined ? defaultValue : undefined}
                onChange={onChange ? (e: any) => onChange(e.target.value) : undefined}
                disabled={disabled}
            />
        </div>
    );
}
