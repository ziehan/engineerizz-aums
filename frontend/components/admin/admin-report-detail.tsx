"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminActions } from "@/components/admin/admin-actions";
import { DuplicatesPanel } from "@/components/admin/duplicates-panel";
import { ReportDetailBody } from "@/components/report-detail/report-detail-body";
import { ErrorState, ListSkeleton } from "@/components/ui/feedback";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import useReport from "@/hooks/useReport";

/** Detail lengkap laporan untuk admin: approve, hapus laporan, dan kelola duplikat. */
export function AdminReportDetail({ id }: { id: string }) {
  const router = useRouter();
  const { user } = useCurrentUser();
  const { report, isLoading, error, reload } = useReport(id);

  if (isLoading) return <ListSkeleton rows={4} />;

  if (error || !report) {
    return (
      <div className="flex flex-col items-center gap-4">
        <ErrorState
          message={error?.status === 404 ? "Laporan tidak ditemukan." : (error?.message ?? "Gagal memuat laporan.")}
          onRetry={error?.status === 404 ? undefined : reload}
        />
        <Link href="/admin/reports" className="text-sm font-semibold text-blue-700 hover:underline">
          ← Kembali ke daftar laporan
        </Link>
      </div>
    );
  }

  return (
    <ReportDetailBody
      report={report}
      actions={
        <AdminActions
          report={report}
          adminName={user.name}
          onApproved={reload}
          onDeleted={() => router.replace("/admin/reports")}
        />
      }
      extra={<DuplicatesPanel report={report} onChanged={reload} />}
    />
  );
}
