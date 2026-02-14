'use client';

import React, { useState } from 'react';
import { Send, Users, MessageSquare, Clock, Zap } from 'lucide-react';

export default function CampaignsPage() {
    return (
        <div className="w-full">
            <div className="mb-12">
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                    <Send className="w-8 h-8 text-amber-400" />
                    Campaign Automation
                </h1>
                <p className="text-slate-400 mt-2">Scale your outreach without getting blocked</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Sidebar: Recent Campaigns */}
                <div className="lg:col-span-1 glass-panel p-6 rounded-3xl h-fit">
                    <h2 className="text-lg font-bold text-white mb-6">Recent Campaigns</h2>
                    <div className="space-y-4">
                        <div className="p-4 rounded-xl bg-[#ffffff03] border border-[#ffffff05] group hover:border-blue-500/30 transition-all">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-sm font-bold text-slate-200">Promo February</span>
                                <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded">Active</span>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
                                <span className="flex items-center gap-1"><Users className="w-3 h-3" /> 142 Leads</span>
                                <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> 12% Open</span>
                            </div>
                            <div className="w-full bg-[#ffffff05] h-1.5 rounded-full overflow-hidden">
                                <div className="bg-blue-500 h-full w-[45%]" />
                            </div>
                        </div>

                        <div className="p-4 rounded-xl bg-[#ffffff03] border border-[#ffffff05] opacity-60">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-sm font-bold text-slate-200">Intro Blast</span>
                                <span className="text-xs bg-slate-500/10 text-slate-400 px-2 py-0.5 rounded">Done</span>
                            </div>
                            <p className="text-xs text-slate-500">Sent to 85 contacts</p>
                        </div>
                    </div>
                </div>

                {/* Main: Builder */}
                <div className="lg:col-span-2 glass-panel p-8 rounded-3xl">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">1</div>
                        <div>
                            <h3 className="text-lg font-bold text-white">Target Audience</h3>
                            <p className="text-sm text-slate-500">Who should receive this message?</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-10 pl-14">
                        <button className="p-4 rounded-xl border border-blue-500 bg-blue-500/10 text-blue-100 flex items-center gap-2 justify-center font-medium">
                            <Zap className="w-5 h-5" /> High Score Leads
                        </button>
                        <button className="p-4 rounded-xl border border-[#ffffff08] bg-[#ffffff03] text-slate-400 hover:text-white flex items-center gap-2 justify-center font-medium">
                            <Users className="w-5 h-5" /> All Contacts
                        </button>
                    </div>

                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">2</div>
                        <div>
                            <h3 className="text-lg font-bold text-white">Message Content</h3>
                            <p className="text-sm text-slate-500">Variables: {'{name}'}, {'{location}'}</p>
                        </div>
                    </div>

                    <div className="pl-14 mb-10">
                        <textarea
                            className="w-full h-40 bg-[#0a0c10] border border-[#ffffff10] rounded-xl p-4 text-slate-300 focus:outline-none focus:border-blue-500/50 transition-colors"
                            placeholder="Hello {name}, I saw your business in {location}..."
                        />
                        <div className="flex justify-end mt-2">
                            <button className="text-xs text-blue-400 hover:text-blue-300 font-mono">Use Template</button>
                        </div>
                    </div>

                    <div className="flex justify-end pt-6 border-t border-[#ffffff05]">
                        <button className="bg-amber-500 hover:bg-amber-600 text-black px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                            <Send className="w-5 h-5" /> Launch Campaign
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
