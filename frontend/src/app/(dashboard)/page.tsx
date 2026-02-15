'use client';

import React from 'react';
import useSWR from 'swr';
import { api, fetcher, Lead, Stats } from '@/lib/api';
import {
  Activity, Users, Zap, Clock, ArrowRight, Sparkles, PieChart,
  BarChart as BarChartIcon, Filter, TrendingUp, Send, Target,
  DollarSign, CalendarDays
} from 'lucide-react';
import LeadSourceChart from '@/components/analytics/LeadSourceChart';
import ScoreChart from '@/components/analytics/ScoreChart';
import FunnelChart from '@/components/analytics/FunnelChart';
import WeeklyChart from '@/components/analytics/WeeklyChart';
import AIBriefingCard from '@/components/analytics/AIBriefingCard';
import SystemLogs from '@/components/analytics/SystemLogs';

export default function Dashboard() {
  const { data: leads, error: leadsError } = useSWR<Lead[]>(`${api.API_URL}/api/leads`, fetcher);
  const { data: stats, error: statsError } = useSWR<Stats>(`${api.API_URL}/api/stats`, fetcher);

  const loading = !leads || !stats;
  if (leadsError || statsError) console.error("Dashboard SWR Error:", leadsError || statsError);

  return (
    <div className="w-full">
      {/* Hero Section */}
      <div className="mb-10 relative">
        <div className="absolute top-0 left-0 w-20 h-2 bg-gradient-to-r from-blue-500 to-cyan-500 blur-xl opacity-50" />
        <h1 className="text-4xl font-bold text-foreground tracking-tight flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-primary fill-primary/20" />
          Mission Control
        </h1>
        <p className="text-muted-foreground mt-2 text-lg">System Status: <span className="text-emerald-500 font-medium tracking-wide">OPERATIONAL</span></p>
      </div>

      {/* Stats Grid - 2 rows */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <StatCard icon={<Users className="w-5 h-5 text-blue-500" />} title="Total Leads" value={stats?.total_leads || 0} subtitle="All sources" color="blue" />
        <StatCard icon={<Target className="w-5 h-5 text-cyan-500" />} title="Prospects" value={stats?.total_prospects || 0} subtitle="Scraped data" color="cyan" />
        <StatCard icon={<Send className="w-5 h-5 text-emerald-500" />} title="Messages Sent" value={stats?.total_sent || 0} subtitle={`${stats?.total_failed || 0} failed`} color="emerald" />
        <StatCard icon={<Zap className="w-5 h-5 text-amber-500" />} title="Active Campaigns" value={stats?.active_campaigns || 0} subtitle={`${stats?.total_campaigns || 0} total`} color="amber" />
        <StatCard icon={<TrendingUp className="w-5 h-5 text-violet-500" />} title="Won Deals" value={stats?.won || 0} subtitle={`${stats?.interested || 0} interested`} color="violet" />
        <StatCard icon={<Activity className="w-5 h-5 text-emerald-500" />} title="Active Projects" value={stats?.active_projects || 0} subtitle={`${stats?.total_projects || 0} total`} color="emerald" />
        <StatCard icon={<DollarSign className="w-5 h-5 text-green-500" />} title="Revenue" value={`Rp ${((stats?.total_revenue || 0) / 1000000).toFixed(1)}M`} subtitle={`${stats?.unpaid_invoices || 0} unpaid`} color="green" />
        <StatCard icon={<CalendarDays className="w-5 h-5 text-rose-500" />} title="Pending Follow-ups" value={stats?.pending_followups || 0} subtitle="Tasks due" color="rose" />
      </div>

      {/* Charts Grid - Row 1: 3 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-card border border-border p-6 rounded-2xl">
          <h2 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2 uppercase tracking-widest">
            <PieChart className="w-4 h-4 text-blue-500" /> Lead Sources
          </h2>
          <LeadSourceChart leads={leads || []} />
        </div>
        <div className="bg-card border border-border p-6 rounded-2xl">
          <h2 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2 uppercase tracking-widest">
            <BarChartIcon className="w-4 h-4 text-emerald-500" /> Score Distribution
          </h2>
          <ScoreChart leads={leads || []} />
        </div>
        <div className="bg-card border border-border p-6 rounded-2xl">
          <h2 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2 uppercase tracking-widest">
            <Filter className="w-4 h-4 text-amber-500" /> Conversion Funnel
          </h2>
          {stats ? <FunnelChart data={stats} /> : <div className="h-[300px] flex items-center justify-center text-muted-foreground">Loading...</div>}
        </div>
      </div>

      {/* Charts Grid - Row 2: Weekly Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
        <div className="bg-card border border-border p-6 rounded-2xl">
          <h2 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2 uppercase tracking-widest">
            <CalendarDays className="w-4 h-4 text-cyan-500" /> Weekly Outreach Performance
          </h2>
          {stats?.weekly ? <WeeklyChart data={stats.weekly} /> : <div className="h-[300px] flex items-center justify-center text-muted-foreground">Loading...</div>}
        </div>

        {/* Quick Campaign Summary */}
        <div className="bg-card border border-border p-6 rounded-2xl">
          <h2 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2 uppercase tracking-widest">
            <Send className="w-4 h-4 text-emerald-500" /> Campaign Overview
          </h2>
          <div className="space-y-4">
            <MetricBar label="Messages Sent" value={stats?.total_sent || 0} max={(stats?.total_sent || 0) + (stats?.total_failed || 0) || 1} color="bg-emerald-500" />
            <MetricBar label="Messages Failed" value={stats?.total_failed || 0} max={(stats?.total_sent || 0) + (stats?.total_failed || 0) || 1} color="bg-destructive" />
            <MetricBar label="Leads Contacted" value={stats?.contacted || 0} max={stats?.total_leads || 1} color="bg-amber-500" />
            <MetricBar label="Prospects Contacted" value={stats?.prospects_contacted || 0} max={stats?.total_prospects || 1} color="bg-cyan-500" />
            <MetricBar label="Deals Won" value={stats?.won || 0} max={stats?.total_leads || 1} color="bg-violet-500" />
          </div>
          <div className="mt-6 pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <span>Success Rate</span>
            <span className="font-bold text-foreground text-lg">
              {(stats?.total_sent || 0) > 0
                ? Math.round(((stats?.total_sent || 0) / ((stats?.total_sent || 0) + (stats?.total_failed || 0))) * 100)
                : 0}%
            </span>
          </div>
        </div>
      </div>

      {/* AI Specialist Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
        <AIBriefingCard />
        <SystemLogs />
      </div>

      {/* Recent Leads Table */}
      <div className="bg-card border border-border rounded-2xl p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-[1px] bg-gradient-to-l from-primary/50 to-transparent" />
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-sm font-bold flex items-center gap-2 text-foreground uppercase tracking-widest">
            <Clock className="w-4 h-4 text-muted-foreground" /> Recent Interceptions
          </h2>
          <a href="/leads" className="group flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium transition-colors">
            View All <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </a>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-muted-foreground gap-4">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-sm font-mono tracking-widest uppercase">Initializing Datastream...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-xs font-mono text-muted-foreground uppercase tracking-widest">
                  <th className="py-4 pl-4">Target Identity</th>
                  <th className="py-4 hidden md:table-cell">Affiliation</th>
                  <th className="py-4 text-right pr-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {leads?.slice(0, 5).map((lead) => (
                  <tr key={lead.id} className="group hover:bg-muted/50 transition-colors cursor-default">
                    <td className="py-4 pl-4">
                      <div className="font-medium text-foreground group-hover:text-primary transition-colors">{lead.title}</div>
                    </td>
                    <td className="py-4 text-muted-foreground hidden md:table-cell">{lead.company}</td>
                    <td className="py-4 text-right pr-4 text-muted-foreground font-mono text-sm">
                      {new Date(lead.created_at || '').toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {(!leads || leads.length === 0) && (
                  <tr><td colSpan={3} className="py-8 text-center text-muted-foreground font-mono text-sm">NO SIGNAL DETECTED</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, title, value, subtitle, color }: { icon: React.ReactNode; title: string; value: string | number; subtitle: string; color: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 relative overflow-hidden group hover:border-primary/30 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="p-2.5 bg-accent/50 rounded-xl border border-border">
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground font-medium mt-0.5">{title}</p>
      <p className="text-[10px] text-muted-foreground mt-1 font-mono">{subtitle}</p>
    </div>
  );
}

function MetricBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-foreground font-bold">{value}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
