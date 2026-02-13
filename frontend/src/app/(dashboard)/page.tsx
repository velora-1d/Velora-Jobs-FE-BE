'use client';

import React, { useEffect, useState } from 'react';
import { api, Lead } from '@/lib/api';
import { Activity, Users, Zap, Clock, ArrowRight, Sparkles } from 'lucide-react';

export default function Dashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await api.getLeads();
        setLeads(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="w-full">
      {/* Hero Section */}
      <div className="mb-12 relative">
        <div className="absolute top-0 left-0 w-20 h-2 bg-gradient-to-r from-blue-500 to-cyan-500 blur-xl opacity-50" />
        <h1 className="text-4xl font-bold text-white tracking-tight flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-cyan-400 fill-cyan-400/20" />
          Mission Control
        </h1>
        <p className="text-slate-400 mt-2 text-lg">System Status: <span className="text-emerald-400 font-medium tracking-wide">OPERATIONAL</span></p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <StatCard
          icon={<Users className="w-6 h-6 text-blue-400" />}
          title="Total Leads"
          value={leads.length.toString()}
          subtitle="All sources"
        />
        <StatCard
          icon={<Activity className="w-6 h-6 text-emerald-400" />}
          title="System Health"
          value="98.2%"
          subtitle="Uptime"
        />
        <StatCard
          icon={<Zap className="w-6 h-6 text-amber-400" />}
          title="Pending Actions"
          value="0"
          subtitle="Queue empty"
        />
      </div>

      {/* Glass Panel Content */}
      <div className="glass-panel rounded-3xl p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-[1px] bg-gradient-to-l from-blue-500/50 to-transparent" />

        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-400" />
            Recent Interceptions
          </h2>
          <a href="/leads" className="group flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
            View Full Database
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </a>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-600 gap-4">
            <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-sm font-mono tracking-widest uppercase">Initializing Datastream...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#ffffff08] text-xs font-mono text-slate-500 uppercase tracking-widest">
                  <th className="py-4 pl-4">Target Identity</th>
                  <th className="py-4 hidden md:table-cell">Affiliation</th>
                  <th className="py-4 text-right pr-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ffffff03]">
                {leads.slice(0, 5).map((lead) => (
                  <tr key={lead.id} className="group hover:bg-[#ffffff03] transition-colors cursor-default">
                    <td className="py-4 pl-4">
                      <div className="font-medium text-slate-200 group-hover:text-blue-400 transition-colors">{lead.title}</div>
                    </td>
                    <td className="py-4 text-slate-400 hidden md:table-cell">{lead.company}</td>
                    <td className="py-4 text-right pr-4 text-slate-600 font-mono text-sm">
                      {new Date(lead.created_at || '').toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {leads.length === 0 && (
                  <tr><td colSpan={3} className="py-8 text-center text-slate-600 font-mono text-sm">NO SIGNAL DETECTED</td></tr>
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
    <div className="glass-panel glass-card-hover rounded-2xl p-6 relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
        {React.cloneElement(icon, { className: "w-24 h-24" })}
      </div>
      <div>
        <div className="mb-4 p-3 bg-[#ffffff05] w-fit rounded-xl border border-[#ffffff05]">
          {icon}
        </div>
        <p className="text-slate-500 text-sm font-medium tracking-wide uppercase">{title}</p>
        <p className="text-3xl font-bold text-white mt-1 neon-text">{value}</p>
        <p className="text-xs text-slate-600 mt-2 font-mono">{subtitle}</p>
      </div>
    </div>
  );
}
