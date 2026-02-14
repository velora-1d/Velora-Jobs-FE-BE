'use client';
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Lead } from '@/lib/api';

export default function ScoreChart({ leads }: { leads: Lead[] }) {
    const data = React.useMemo(() => {
        let high = 0, mid = 0, low = 0, unknown = 0;
        leads.forEach(l => {
            const s = l.match_score;
            if (typeof s !== 'number') unknown++;
            else if (s >= 75) high++;
            else if (s >= 50) mid++;
            else low++;
        });

        return [
            { name: 'High (>75)', value: high, color: '#10b981' }, // Emerald
            { name: 'Mid (50-75)', value: mid, color: '#f59e0b' }, // Amber
            { name: 'Low (<50)', value: low, color: '#ef4444' },  // Red
            { name: 'N/A', value: unknown, color: '#64748b' }     // Slate
        ];
    }, [leads]);

    if (leads.length === 0) return <div className="text-center text-slate-500 py-10">No data available</div>;

    return (
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip
                        cursor={{ fill: '#ffffff05' }}
                        contentStyle={{ backgroundColor: '#0f1117', borderColor: '#334155', borderRadius: '12px' }}
                        itemStyle={{ color: '#e2e8f0' }}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
