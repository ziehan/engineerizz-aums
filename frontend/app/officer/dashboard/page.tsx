"use client";

import { useMemo } from "react";
import { GreetingHeader } from "@/components/layout/greeting-header";
import { ReportMap, type MapPoint } from "@/components/map/report-map";
import { ReportStats } from "@/components/reports/report-stats";
import { ReportListSection } from "@/components/reports/report-list-section";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import useReportList from "@/hooks/useReportList";

/** Dashboard petugas: ringkasan, peta sebaran aduan, dan daftar aduan masyarakat. */
export default function OfficerDashboardPage() {
  const { user } = useCurrentUser();
  const { reports, isLoading, error, reload } = useReportList();

  // Memo agar peta tidak dibuild ulang pada setiap render.
  const points = useMemo<MapPoint[]>(
    () =>
      reports.map((r) => ({
        id: r.id,
        title: r.title,
        latitude: r.latitude,
        longitude: r.longitude,
        priority: r.priority,
        href: `/officer/reports/${r.id}`,
      })),
    [reports],
  );

  return (
    <div className="flex flex-col gap-8 md:gap-10">
      <GreetingHeader
        name={user.name}
        description="Pantau aduan masyarakat yang masuk, ambil tugas sesuai bidang Anda, dan pastikan setiap laporan ditangani hingga tuntas."
      />

      <ReportStats reports={reports} />

      <div className="grid gap-6 lg:grid-cols-[2fr_3fr] lg:gap-8">
        <ReportMap points={points} className="h-72 lg:sticky lg:top-20 lg:h-[34rem]" />
        <ReportListSection
          title="Aduan Masyarakat"
          reports={reports}
          isLoading={isLoading}
          error={error}
          onRetry={reload}
          pageSize={3}
          actionLabel="Detail"
          getHref={(r) => `/officer/reports/${r.id}`}
        />
      </div>
    </div>
  );
}
