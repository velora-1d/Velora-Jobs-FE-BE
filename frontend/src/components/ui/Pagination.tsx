'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
    currentPage: number;
    totalItems: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    onPageSizeChange?: (size: number) => void;
    pageSizeOptions?: number[];
}

export function Pagination({
    currentPage,
    totalItems,
    pageSize,
    onPageChange,
    onPageSizeChange,
    pageSizeOptions = [10, 25, 50, 100],
}: PaginationProps) {
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalItems);

    const getVisiblePages = (): (number | '...')[] => {
        if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
        const pages: (number | '...')[] = [];
        pages.push(1);
        if (currentPage > 3) pages.push('...');
        const start = Math.max(2, currentPage - 1);
        const end = Math.min(totalPages - 1, currentPage + 1);
        for (let i = start; i <= end; i++) pages.push(i);
        if (currentPage < totalPages - 2) pages.push('...');
        pages.push(totalPages);
        return pages;
    };

    if (totalItems <= pageSize && !onPageSizeChange) return null;

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-border bg-accent/5">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="font-mono text-xs">
                    {startItem}–{endItem} of {totalItems}
                </span>
                {onPageSizeChange && (
                    <div className="flex items-center gap-2">
                        <span className="text-xs">Per page:</span>
                        <select
                            value={pageSize}
                            onChange={e => onPageSizeChange(Number(e.target.value))}
                            className="bg-input border border-border rounded-lg px-2 py-1 text-xs text-foreground focus:outline-none focus:border-blue-500/30 cursor-pointer"
                        >
                            {pageSizeOptions.map(size => (
                                <option key={size} value={size} className="bg-popover text-popover-foreground">{size}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-1">
                <button
                    onClick={() => onPageChange(1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    title="First"
                >
                    <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    title="Previous"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>

                {getVisiblePages().map((page, i) =>
                    page === '...' ? (
                        <span key={`ellipsis-${i}`} className="px-2 py-1 text-xs text-muted-foreground">…</span>
                    ) : (
                        <button
                            key={page}
                            onClick={() => onPageChange(page)}
                            className={`min-w-[32px] h-8 rounded-lg text-xs font-bold transition-all ${currentPage === page
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/20'
                                }`}
                        >
                            {page}
                        </button>
                    )
                )}

                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    title="Next"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
                <button
                    onClick={() => onPageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    title="Last"
                >
                    <ChevronsRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
