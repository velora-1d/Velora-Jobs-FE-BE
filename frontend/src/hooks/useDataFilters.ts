import { useState, useMemo, useEffect, useCallback, useRef } from 'react';

interface UseDataFiltersOptions<T> {
    data: T[];
    searchFields: (keyof T)[];
    defaultPageSize?: number;
    debounceMs?: number;
}

interface UseDataFiltersReturn<T> {
    // Search
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    debouncedSearch: string;
    showSearch: boolean;
    setShowSearch: (v: boolean) => void;

    // Pagination
    currentPage: number;
    setCurrentPage: (p: number) => void;
    pageSize: number;
    setPageSize: (s: number) => void;

    // Date range
    dateRange: { start: string; end: string } | null;
    filterLabel: string;
    applyDateFilter: (days: number | 'all') => void;

    // Generic filters
    filters: Record<string, string>;
    setFilter: (key: string, value: string) => void;

    // Output
    filteredData: T[];
    paginatedData: T[];
    totalFiltered: number;
}

export function useDataFilters<T extends Record<string, any>>({
    data,
    searchFields,
    defaultPageSize = 25,
    debounceMs = 300,
}: UseDataFiltersOptions<T>): UseDataFiltersReturn<T> {
    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [showSearch, setShowSearch] = useState(false);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(defaultPageSize);

    // Date range state
    const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);
    const [filterLabel, setFilterLabel] = useState('All Time');

    // Generic key-value filters
    const [filters, setFilters] = useState<Record<string, string>>({});

    // Debounce timer ref
    const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    // Debounce search
    useEffect(() => {
        timerRef.current = setTimeout(() => setDebouncedSearch(searchQuery), debounceMs);
        return () => clearTimeout(timerRef.current);
    }, [searchQuery, debounceMs]);

    // Reset page on any filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearch, filters, dateRange]);

    const setFilter = useCallback((key: string, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    }, []);

    const applyDateFilter = useCallback((days: number | 'all') => {
        if (days === 'all') {
            setDateRange(null);
            setFilterLabel('All Time');
            return;
        }
        const end = new Date();
        const start = new Date();
        if (days === 0) {
            setFilterLabel('Today');
        } else if (days === 1) {
            start.setDate(start.getDate() - 1);
            end.setDate(end.getDate() - 1);
            setFilterLabel('Yesterday');
        } else {
            start.setDate(start.getDate() - days);
            setFilterLabel(`Last ${days} Days`);
        }
        setDateRange({
            start: start.toISOString().split('T')[0],
            end: end.toISOString().split('T')[0],
        });
    }, []);

    // Apply search filter
    const filteredData = useMemo(() => {
        if (!debouncedSearch) return data;
        const q = debouncedSearch.toLowerCase();
        return data.filter(item =>
            searchFields.some(field => {
                const val = item[field];
                return typeof val === 'string' && val.toLowerCase().includes(q);
            })
        );
    }, [data, debouncedSearch, searchFields]);

    // Pagination
    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredData.slice(start, start + pageSize);
    }, [filteredData, currentPage, pageSize]);

    return {
        searchQuery,
        setSearchQuery,
        debouncedSearch,
        showSearch,
        setShowSearch,
        currentPage,
        setCurrentPage,
        pageSize,
        setPageSize,
        dateRange,
        filterLabel,
        applyDateFilter,
        filters,
        setFilter,
        filteredData,
        paginatedData,
        totalFiltered: filteredData.length,
    };
}
