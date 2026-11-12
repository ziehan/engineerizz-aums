"use client";

import Link from "next/link";
import { GreetingHeader } from "@/components/layout/greeting-header";
import { ReportStats } from "@/components/reports/report-stats";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/feedback";
import { PriorityBadge, StatusBadge } from "@/components/ui/badges";
import { HealthCard } from "@/components/admin/health-card";
import { ReportBreakdown } from "@/components/admin/report-breakdown";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import useReportList from "@/hooks/useReportList";
import { needsReview } from "@/lib/report-labels";

/** Dashboard admin: ringkasan laporan, status sistem, distribusi, dan antrian tinjauan. */
export default function AdminDashboardPage() {
  const { user } = useCurrentUser();
  const { reports, isLoading, error, reload } = useReportList();
  const queue = reports.filter(needsReview).slice(0, 5);

  return (
    <div className="flex flex-col gap-8 md:gap-10">
      <GreetingHeader
        name={user.name}
        description="Ringkasan seluruh aduan masyarakat, kondisi sistem, dan laporan yang memerlukan keputusan admin."
      />

      <ReportStats reports={reports} />

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        <HealthCard />
        <ReportBreakdown reports={reports} />
      </div>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold md:text-2xl">Perlu Tinjauan</h2>
          <Link href="/admin/reports" className="text-sm font-semibold text-blue-700 hover:underline">
            Lihat semua →
          </Link>
        </div>

        <div className="mt-3 flex flex-col gap-2">
          {isLoading ? (
            <ListSkeleton rows={2} />
          ) : error ? (
            <ErrorState message={error} onRetry={reload} />
          ) : queue.length === 0 ? (
            <EmptyState message="Tidak ada laporan yang menunggu tinjauan." />
          ) : (
            queue.map((r) => (
              <Link
                key={r.id}
                href={`/admin/reports/${r.id}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-neutral-200 bg-white p-3 shadow-sm hover:shadow-md"
              >
                <span className="min-w-0 truncate text-sm font-semibold">{r.title}</span>
                <span className="flex gap-2">
                  <PriorityBadge priority={r.priority} />
                  <StatusBadge status={r.status} />
                </span>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
