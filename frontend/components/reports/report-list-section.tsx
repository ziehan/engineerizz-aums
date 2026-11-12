"use client";

import { useMemo } from "react";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/feedback";
import { Pagination } from "@/components/ui/pagination";
import useFilteredList from "@/hooks/useFilteredList";
import { categoryOptions } from "@/lib/report-labels";
import type { Report } from "@/lib/report-types";
import { ReportCard } from "./report-card";
import { ReportFilters } from "./report-filters";

interface ReportListSectionProps {
  title: string;
  reports: Report[];
  isLoading: boolean;
  error: string;
  onRetry: () => void;
  pageSize: number;
  actionLabel: string;
  getHref: (report: Report) => string;
  emptyMessage?: string;
}

/** Daftar laporan lengkap: judul, filter, kartu, state kosong/error, dan pagination. */
export function ReportListSection({
  title,
  reports,
  isLoading,
  error,
  onRetry,
  pageSize,
  actionLabel,
  getHref,
  emptyMessage = "Belum ada laporan yang sesuai.",
}: ReportListSectionProps) {
  const list = useFilteredList(reports, pageSize);
  const categories = useMemo(() => categoryOptions(reports), [reports]);

  return (
    <section className="min-w-0">
      <h2 className="text-xl font-bold text-neutral-1000 md:text-2xl">{title}</h2>
      <div className="mt-3">
        <ReportFilters filters={list.filters} categories={categories} onChange={list.setFilter} />
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {isLoading ? (
          <ListSkeleton />
        ) : error ? (
          <ErrorState message={error} onRetry={onRetry} />
        ) : list.items.length === 0 ? (
          <EmptyState message={emptyMessage} />
        ) : (
          list.items.map((r) => (
            <ReportCard key={r.id} report={r} href={getHref(r)} actionLabel={actionLabel} />
          ))
        )}
      </div>

      <Pagination page={list.page} totalPages={list.totalPages} onChange={list.setPage} />
    </section>
  );
}
