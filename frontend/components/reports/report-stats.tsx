import { StatCard } from "@/components/ui/stat-card";
import { formatCount } from "@/lib/format";
import { isInProgress, isResolved, needsReview } from "@/lib/report-labels";
import type { Report } from "@/lib/report-types";

/** Empat kartu ringkasan dashboard (petugas & admin). */
export function ReportStats({ reports }: { reports: Report[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-4">
      <StatCard title="Total Aduan" tone="blue" value={formatCount(reports.length)} />
      <StatCard
        title="Dalam Proses"
        tone="amber"
        value={formatCount(reports.filter(isInProgress).length)}
      />
      <StatCard
        title="Perlu Peninjauan"
        tone="red"
        value={formatCount(reports.filter(needsReview).length)}
      />
      <StatCard
        title="Selesai"
        tone="green"
        value={formatCount(reports.filter(isResolved).length)}
      />
    </div>
  );
}
