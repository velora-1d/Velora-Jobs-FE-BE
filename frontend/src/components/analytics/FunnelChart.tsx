'use client';

import React from 'react';
import { ResponsiveContainer, FunnelChart as ReFunnelChart, Funnel, Tooltip, LabelList, Cell } from 'recharts';

interface FunnelChartProps {
    data: {
        new_leads: number;
        contacted: number;
        won: number;
    };
}

const COLORS = ['#3b82f6', '#f59e0b', '#10b981']; // Blue, Amber, Emerald

export default function FunnelChart({ data }: FunnelChartProps) {
    const chartData = [
        { name: 'New Leads', value: data.new_leads, fill: COLORS[0] },
        { name: 'Contacted', value: data.contacted, fill: COLORS[1] },
        { name: 'Won Deals', value: data.won, fill: COLORS[2] },
    ];

    // Handle empty data
    if (chartData.every(d => d.value === 0)) {
        return <div className="h-full flex items-center justify-center text-slate-500 text-sm">No data available</div>;
    }

    return (
        <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
                <ReFunnelChart>
                    <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff' }}
                        itemStyle={{ color: '#fff' }}
                        formatter={(value: any) => [value, 'Leads']}
                    />
                    <Funnel
                        dataKey="value"
                        data={chartData}
                        isAnimationActive
                    >
                        <LabelList position="right" fill="#94a3b8" stroke="none" dataKey="name" />
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                    </Funnel>
                </ReFunnelChart>
            </ResponsiveContainer>
        </div>
    );
}
