'use client';

import Sidebar from '@/components/Sidebar';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen bg-background transition-colors duration-300">
            <Sidebar />
            <main className="flex-1 lg:ml-64 p-8 overflow-y-auto relative z-10">
                {children}
            </main>
        </div>
    );
}
