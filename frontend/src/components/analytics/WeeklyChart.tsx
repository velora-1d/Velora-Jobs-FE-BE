'use client';

import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';

interface WeeklyChartProps {
    data: { date: string; leads: number; prospects: number }[];
}

export default function WeeklyChart({ data }: WeeklyChartProps) {
    if (!data || data.length === 0 || data.every(d => d.leads === 0 && d.prospects === 0)) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
                <div className="text-4xl opacity-30">📅</div>
                <p>No activity this week</p>
            </div>
        );
    }

    return (
        <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                    <XAxis
                        dataKey="date"
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                        axisLine={{ stroke: 'hsl(var(--border))' }}
                        tickLine={false}
                    />
                    <YAxis
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'hsl(var(--popover))',
                            borderColor: 'hsl(var(--border))',
                            color: 'hsl(var(--popover-foreground))',
                            borderRadius: '12px',
                            padding: '8px 14px',
                            fontSize: '12px'
                        }}
                        cursor={{ fill: 'hsl(var(--accent))', opacity: 0.3 }}
                    />
                    <Legend
                        wrapperStyle={{ fontSize: '11px', color: 'hsl(var(--muted-foreground))' }}
                    />
                    <Bar dataKey="prospects" name="Prospects" fill="#06b6d4" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="leads" name="Leads" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
