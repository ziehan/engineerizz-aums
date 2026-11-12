"use client";

import { useMemo, useState } from "react";
import type { Report } from "@/lib/report-types";

export interface ListFilters {
  status: string;
  category: string;
  priority: string;
}

const EMPTY: ListFilters = { status: "", category: "", priority: "" };

/**
 * Menyaring laporan di sisi klien lalu memecahnya per halaman.
 */
export default function useFilteredList(reports: Report[], pageSize: number) {
  const [filters, setFilters] = useState<ListFilters>(EMPTY);
  const [page, setPage] = useState(1);

  const filtered = useMemo(
    () =>
      reports.filter(
        (r) =>
          (!filters.status || r.status === filters.status) &&
          (!filters.category || r.category === filters.category) &&
          (!filters.priority || r.priority === filters.priority),
      ),
    [reports, filters],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);

  const setFilter = (name: keyof ListFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPage(1);
  };

  return {
    filters,
    setFilter,
    page: currentPage,
    setPage,
    totalPages,
    total: filtered.length,
    items: filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
  };
}
