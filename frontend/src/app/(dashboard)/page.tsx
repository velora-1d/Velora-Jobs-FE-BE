'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { api, fetcher, Lead, Stats } from '@/lib/api';
import { Activity, Users, Zap, Clock, ArrowRight, Sparkles, PieChart, BarChart as BarChartIcon, Filter } from 'lucide-react';
import LeadSourceChart from '@/components/analytics/LeadSourceChart';
import ScoreChart from '@/components/analytics/ScoreChart';
import FunnelChart from '@/components/analytics/FunnelChart';

export default function Dashboard() {
  // SWR Hooks for real-time data
  const { data: leads, error: leadsError } = useSWR<Lead[]>(`${api.API_URL}/api/leads`, fetcher);
  const { data: stats, error: statsError } = useSWR<Stats>(`${api.API_URL}/api/stats`, fetcher);

  const loading = !leads || !stats;
  if (leadsError || statsError) console.error("Dashboard SWR Error:", leadsError || statsError);

  return (
    <div className="w-full">
      {/* Hero Section */}
      <div className="mb-12 relative">
        <div className="absolute top-0 left-0 w-20 h-2 bg-gradient-to-r from-blue-500 to-cyan-500 blur-xl opacity-50" />
        <h1 className="text-4xl font-bold text-foreground tracking-tight flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-primary fill-primary/20" />
          Mission Control
        </h1>
        <p className="text-muted-foreground mt-2 text-lg">System Status: <span className="text-emerald-500 font-medium tracking-wide">OPERATIONAL</span></p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <StatCard
          icon={<Users className="w-6 h-6 text-blue-500" />}
          title="Total Leads"
          value={leads?.length.toString() || "0"}
          subtitle="All sources"
        />
        <StatCard
          icon={<Activity className="w-6 h-6 text-emerald-500" />}
          title="System Health"
          value="98.2%"
          subtitle="Uptime"
        />
        <StatCard
          icon={<Zap className="w-6 h-6 text-amber-500" />}
          title="Pending Actions"
          value={stats?.pending_followups.toString() || "0"}
          subtitle="Tasks due"
        />
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
        <div className="glass-panel p-6 rounded-3xl bg-card border border-border">
          <h2 className="text-lg font-bold text-card-foreground mb-6 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-blue-500" /> Lead Sources
          </h2>
          <LeadSourceChart leads={leads || []} />
        </div>
        <div className="glass-panel p-6 rounded-3xl bg-card border border-border">
          <h2 className="text-lg font-bold text-card-foreground mb-6 flex items-center gap-2">
            <BarChartIcon className="w-5 h-5 text-emerald-500" /> Score Distribution
          </h2>
          <ScoreChart leads={leads || []} />
        </div>
        <div className="glass-panel p-6 rounded-3xl bg-card border border-border">
          <h2 className="text-lg font-bold text-card-foreground mb-6 flex items-center gap-2">
            <Filter className="w-5 h-5 text-amber-500" /> Pipeline Funnel
          </h2>
          {stats ? <FunnelChart data={stats} /> : <div className="h-full flex items-center justify-center text-muted-foreground">Loading...</div>}
        </div>
      </div>

      {/* Glass Panel Content */}
      <div className="glass-panel rounded-3xl p-8 relative overflow-hidden bg-card border border-border">
        <div className="absolute top-0 right-0 w-full h-[1px] bg-gradient-to-l from-primary/50 to-transparent" />

        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
            <Clock className="w-5 h-5 text-muted-foreground" />
            Recent Interceptions
          </h2>
          <a href="/leads" className="group flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium transition-colors">
            View Full Database
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
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

function StatCard({ icon, title, value, subtitle }: any) {
  return (
    <div className="glass-panel glass-card-hover rounded-2xl p-6 relative overflow-hidden group bg-card border border-border">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
        {React.cloneElement(icon, { className: "w-24 h-24" })}
      </div>
      <div>
        <div className="mb-4 p-3 bg-accent/50 w-fit rounded-xl border border-border">
          {icon}
        </div>
        <p className="text-muted-foreground text-sm font-medium tracking-wide uppercase">{title}</p>
        <p className="text-3xl font-bold text-foreground mt-1">{value}</p>
        <p className="text-xs text-muted-foreground mt-2 font-mono">{subtitle}</p>
      </div>
    </div>
  );
}
