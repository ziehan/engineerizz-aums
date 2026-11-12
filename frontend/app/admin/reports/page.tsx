"use client";

import { useMemo } from "react";
import { ReportTable } from "@/components/admin/report-table";
import { PageHeading } from "@/components/layout/page-heading";
import { ReportCard } from "@/components/reports/report-card";
import { ReportFilters } from "@/components/reports/report-filters";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/feedback";
import { Pagination } from "@/components/ui/pagination";
import useFilteredList from "@/hooks/useFilteredList";
import useReportList from "@/hooks/useReportList";
import { categoryOptions } from "@/lib/report-labels";

/** /admin/reports : tabel seluruh laporan */
export default function AdminReportsPage() {
  const { reports, isLoading, error, reload } = useReportList();
  const list = useFilteredList(reports, 10);
  const categories = useMemo(() => categoryOptions(reports), [reports]);

  return (
    <div className="flex flex-col gap-5">
      <PageHeading title="Semua Laporan" subtitle={`${list.total} laporan ditemukan`} />
      <ReportFilters filters={list.filters} categories={categories} onChange={list.setFilter} />

      {isLoading ? (
        <ListSkeleton rows={5} />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : list.items.length === 0 ? (
        <EmptyState message="Tidak ada laporan yang sesuai filter." />
      ) : (
        <>
          <div className="hidden md:block">
            <ReportTable reports={list.items} />
          </div>
          <div className="flex flex-col gap-3 md:hidden">
            {list.items.map((r) => (
              <ReportCard key={r.id} report={r} href={`/admin/reports/${r.id}`} actionLabel="Detail" />
            ))}
          </div>
        </>
      )}

      <Pagination page={list.page} totalPages={list.totalPages} onChange={list.setPage} />
    </div>
  );
}
