import type { Report } from "@/lib/report-types";

/** Skor kepercayaan AI (0–1) → persentase; null bila disembunyikan untuk role ini. */
function confidenceText(report: Report): string {
  const score =
    report.actionPlan?.confidenceScore ??
    report.auditLogs?.find((l) => l.confidenceScore != null)?.confidenceScore;
  return score == null ? "-" : `${Math.round(score * 100)}%`;
}

/** Ringkasan AI: tingkat keyakinan, jumlah duplikasi, dan catatan agen terakhir. */
export function AiSummaryCard({ report }: { report: Report }) {
  const summary =
    report.auditLogs?.[0]?.details ??
    (report.aiProcessed
      ? "Laporan telah dianalisis AI. Rincian teknis hanya tersedia untuk admin."
      : "Laporan ini belum melalui analisis AI.");

  return (
    <section className="rounded-2xl bg-blue-100 p-5 shadow-sm md:p-6">
      <h2 className="text-base font-bold text-neutral-1000 md:text-lg">AI Summary</h2>
      <dl className="mt-3 text-xs text-neutral-900 md:text-sm">
        <div className="flex gap-2">
          <dt className="w-24">Confidence</dt>
          <dd className="font-semibold">: {confidenceText(report)}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-24">Duplikasi</dt>
          <dd className="font-semibold">: {report.duplicateCount ?? 0} laporan</dd>
        </div>
      </dl>
      <p className="mt-3 text-xs leading-relaxed text-neutral-800 md:text-sm">{summary}</p>
    </section>
  );
}
