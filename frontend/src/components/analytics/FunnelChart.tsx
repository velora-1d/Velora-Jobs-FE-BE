'use client';

import React from 'react';
import { ResponsiveContainer, FunnelChart as ReFunnelChart, Funnel, Tooltip, LabelList, Cell } from 'recharts';

interface FunnelChartProps {
    data: {
        total_prospects: number;
        total_leads: number;
        contacted: number;
        interested?: number;
        won: number;
        active_projects: number;
    };
}

const COLORS = ['#06b6d4', '#3b82f6', '#f59e0b', '#8b5cf6', '#10b981', '#ec4899'];

export default function FunnelChart({ data }: FunnelChartProps) {
    const chartData = [
        { name: 'Prospects', value: data.total_prospects || 0, fill: COLORS[0] },
        { name: 'Leads', value: data.total_leads || 0, fill: COLORS[1] },
        { name: 'Contacted', value: data.contacted || 0, fill: COLORS[2] },
        { name: 'Interested', value: data.interested || 0, fill: COLORS[3] },
        { name: 'Won', value: data.won || 0, fill: COLORS[4] },
        { name: 'Active Projects', value: data.active_projects || 0, fill: COLORS[5] },
    ].filter(d => d.value > 0 || d.name === 'Prospects'); // Always show Prospects

    if (chartData.every(d => d.value === 0)) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
                <div className="text-4xl opacity-30">📊</div>
                <p>No data yet — start scraping!</p>
            </div>
        );
    }

    return (
        <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
                <ReFunnelChart>
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'hsl(var(--popover))',
                            borderColor: 'hsl(var(--border))',
                            color: 'hsl(var(--popover-foreground))',
                            borderRadius: '12px',
                            padding: '8px 14px',
                            fontSize: '12px'
                        }}
                        formatter={(value: any, name: any) => [`${value}`, name]}
                    />
                    <Funnel dataKey="value" data={chartData} isAnimationActive>
                        <LabelList position="right" fill="hsl(var(--muted-foreground))" stroke="none" dataKey="name" fontSize={11} />
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                    </Funnel>
                </ReFunnelChart>
            </ResponsiveContainer>

            {/* Conversion rates */}
            <div className="flex items-center justify-center gap-4 mt-2 text-[10px] text-muted-foreground">
                {data.total_prospects > 0 && data.total_leads > 0 && (
                    <span>Prospect→Lead: <strong className="text-blue-500">{Math.round((data.total_leads / data.total_prospects) * 100)}%</strong></span>
                )}
                {data.contacted > 0 && data.won > 0 && (
                    <span>Contact→Won: <strong className="text-emerald-500">{Math.round((data.won / data.contacted) * 100)}%</strong></span>
                )}
            </div>
        </div>
    );
}
