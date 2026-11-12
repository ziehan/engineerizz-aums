"use client";

import { useState } from "react";
import { ActionButton } from "@/components/ui/action-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Alert } from "@/components/ui/feedback";
import { approveReport, deleteReport } from "@/lib/api/reports";
import type { Report } from "@/lib/report-types";

interface AdminActionsProps {
  report: Report;
  adminName: string;
  onApproved: () => void;
  onDeleted: () => void;
}

type Pending = "approve" | "delete" | null;

/** Tombol Setujui & Hapus laporan */
export function AdminActions({ report, adminName, onApproved, onDeleted }: AdminActionsProps) {
  const [pending, setPending] = useState<Pending>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState("");

  const plan = report.actionPlan;
  const alreadyApproved = !!plan?.approvedAt;
  const canApprove = !!plan && !alreadyApproved && report.status !== "Rejected";

  const run = async (action: "approve" | "delete") => {
    setIsBusy(true);
    setError("");
    try {
      if (action === "approve") {
        await approveReport(report.id, adminName);
        onApproved();
      } else {
        await deleteReport(report.id);
        onDeleted();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Aksi gagal dijalankan.");
    } finally {
      setIsBusy(false);
      setPending(null);
    }
  };

  return (
    <>
      <ActionButton
        variant="green"
        disabled={!canApprove}
        title={!plan ? "Belum ada action plan untuk disetujui" : undefined}
        onClick={() => setPending("approve")}
      >
        {alreadyApproved ? "Sudah Disetujui" : "Setujui"}
      </ActionButton>
      <ActionButton variant="red" onClick={() => setPending("delete")}>
        Hapus Laporan
      </ActionButton>

      {error && <Alert className="w-full">{error}</Alert>}

      {pending === "approve" && (
        <ConfirmDialog
          title="Setujui Rencana"
          confirmLabel="Setujui"
          isBusy={isBusy}
          onConfirm={() => run("approve")}
          onCancel={() => setPending(null)}
        >
          Rencana penanganan untuk <strong>{report.title}</strong> akan disetujui atas nama{" "}
          <strong>{adminName}</strong>.
        </ConfirmDialog>
      )}
      {pending === "delete" && (
        <ConfirmDialog
          title="Hapus Laporan"
          confirmLabel="Hapus Permanen"
          tone="red"
          isBusy={isBusy}
          onConfirm={() => run("delete")}
          onCancel={() => setPending(null)}
        >
          Laporan <strong>{report.title}</strong> beserta rencana dan log-nya akan dihapus
          <strong> permanen</strong> dan tidak dapat dikembalikan.
        </ConfirmDialog>
      )}
    </>
  );
}
