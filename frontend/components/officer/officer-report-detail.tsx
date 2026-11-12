"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { PlanModal } from "@/components/officer/plan-modal";
import { VerifyModal } from "@/components/officer/verify-modal";
import { OfficerActions } from "@/components/officer/officer-actions";
import { ReportDetailBody } from "@/components/report-detail/report-detail-body";
import { ErrorState, ListSkeleton } from "@/components/ui/feedback";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import useReport from "@/hooks/useReport";
import useTaskStore from "@/hooks/useTaskStore";

interface OfficerReportDetailProps {
  id: string;
  /** Modal yang terbuka; ditentukan oleh route (/plan atau /verify). */
  modal?: "plan" | "verify";
}

/**
 * Detail laporan untuk petugas lapangan, termasuk modal Planning dan Verifying
 */
export function OfficerReportDetail({ id, modal }: OfficerReportDetailProps) {
  const router = useRouter();
  const { user } = useCurrentUser();
  const { report, isLoading, error, reload } = useReport(id);
  const { claimedIds, claim, refresh } = useTaskStore(user.id);

  const detailPath = `/officer/reports/${id}`;
  const closeModal = () => router.replace(detailPath);

  const handleDone = async () => {
    await reload();
    refresh();
    closeModal();
  };

  if (isLoading) return <ListSkeleton rows={4} />;

  if (error || !report) {
    return (
      <div className="flex flex-col items-center gap-4">
        <ErrorState
          message={error?.status === 404 ? "Laporan tidak ditemukan." : (error?.message ?? "Gagal memuat laporan.")}
          onRetry={error?.status === 404 ? undefined : reload}
        />
        <Link href="/officer/dashboard" className="text-sm font-semibold text-blue-700 hover:underline">
          ← Kembali ke dashboard
        </Link>
      </div>
    );
  }

  return (
    <>
      <ReportDetailBody
        report={report}
        logsRestricted
        actions={
          <OfficerActions
            report={report}
            isClaimed={claimedIds.includes(report.id)}
            onClaim={() => claim(report.id)}
            onPlan={() => router.push(`${detailPath}/plan`)}
            onVerify={() => router.push(`${detailPath}/verify`)}
          />
        }
      />

      {modal === "plan" && (
        <PlanModal report={report} userId={user.id} onClose={closeModal} onSubmitted={handleDone} />
      )}
      {modal === "verify" && (
        <VerifyModal report={report} userId={user.id} onClose={closeModal} onVerified={handleDone} />
      )}
    </>
  );
}
