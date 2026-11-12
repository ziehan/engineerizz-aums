"use client";

import { useMemo } from "react";
import { GreetingHeader } from "@/components/layout/greeting-header";
import { ReportListSection } from "@/components/reports/report-list-section";
import { StatCard } from "@/components/ui/stat-card";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import useReportList from "@/hooks/useReportList";
import useTaskStore from "@/hooks/useTaskStore";
import { formatCount } from "@/lib/format";
import { isResolved } from "@/lib/report-labels";

/** Halaman "Tugas Saya": laporan yang sudah diambil oleh petugas ini. */
export default function OfficerTasksPage() {
  const { user } = useCurrentUser();
  const { reports, isLoading, error, reload } = useReportList();
  const { claimedIds, draftIds } = useTaskStore(user.id);

  const myTasks = useMemo(
    () => reports.filter((r) => claimedIds.includes(r.id)),
    [reports, claimedIds],
  );

  const remaining = myTasks.filter((r) => !isResolved(r)).length;
  const drafts = myTasks.filter((r) => !isResolved(r) && draftIds.includes(r.id)).length;
  const done = myTasks.filter(isResolved).length;

  return (
    <div className="flex flex-col gap-8 md:gap-10">
      <GreetingHeader
        name={user.name}
        description="Berikut daftar tugas yang sedang Anda tangani. Lengkapi rencana kerja dan unggah bukti perbaikan agar laporan dapat diselesaikan."
      />

      <div className="mx-auto grid w-full max-w-3xl grid-cols-3 gap-3 md:gap-5">
        <StatCard title="Tugas Tersisa" tone="blue" value={formatCount(remaining)} />
        <StatCard title="Draft" tone="amber" value={formatCount(drafts)} />
        <StatCard title="Selesai" tone="green" value={formatCount(done)} />
      </div>

      <ReportListSection
        title="List Tugas Saya"
        reports={myTasks}
        isLoading={isLoading}
        error={error}
        onRetry={reload}
        pageSize={5}
        actionLabel="Lihat Detail"
        getHref={(r) => `/officer/reports/${r.id}`}
        emptyMessage="Anda belum mengambil tugas. Buka Dashboard, pilih aduan, lalu tekan Ambil."
      />
    </div>
  );
}
