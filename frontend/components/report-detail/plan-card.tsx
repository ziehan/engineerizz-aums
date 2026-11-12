import type { ReactNode } from "react";
import { formatDateTime } from "@/lib/format";
import type { Report } from "@/lib/report-types";

/** Kartu rencana penanganan; menampilkan placeholder bila belum ada plan. */
export function PlanCard({ report, footer }: { report: Report; footer?: ReactNode }) {
  const plan = report.actionPlan;

  if (!plan) {
    return (
      <section className="flex min-h-48 items-center rounded-2xl border border-neutral-300 bg-white p-6 shadow-md">
        <p className="text-lg font-bold text-neutral-600 md:text-xl">
          Belum ada audit dari petugas...
        </p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-neutral-300 bg-white p-5 shadow-md md:p-6">
      <h2 className="text-lg font-bold text-neutral-1000 md:text-xl">Rencana Penanganan</h2>
      <div className="flex flex-wrap justify-between gap-2 text-xs font-semibold text-neutral-900 md:text-sm">
        <span>{plan.targetAgency}</span>
        <span>Estimasi: {plan.estimatedDays} Hari</span>
      </div>

      {plan.actionSteps.length > 0 && (
        <ol className="list-decimal space-y-1 pl-5 text-xs leading-relaxed text-neutral-800 md:text-sm">
          {plan.actionSteps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      )}

      {report.officerNotes && (
        <p className="rounded-lg bg-neutral-200 p-3 text-xs text-neutral-900 md:text-sm">
          <strong>Catatan petugas:</strong> {report.officerNotes}
        </p>
      )}

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-neutral-200 pt-3 text-xs text-neutral-800 md:text-sm">
        <span>
          {plan.approvedBy
            ? `Disetujui oleh ${plan.approvedBy} · ${formatDateTime(plan.approvedAt)}`
            : "Menunggu persetujuan admin"}
        </span>
        {footer}
      </div>
    </section>
  );
}
