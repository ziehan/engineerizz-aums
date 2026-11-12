import Link from "next/link";
import { CategoryBadge, PriorityBadge, ReviewBadge, StatusBadge } from "@/components/ui/badges";
import { formatDateTime, truncate } from "@/lib/format";
import type { Report } from "@/lib/report-types";

interface ReportCardProps {
  report: Report;
  href: string;
  actionLabel: string;
}

/** Kartu ringkas satu laporan pada daftar petugas. */
export function ReportCard({ report, href, actionLabel }: ReportCardProps) {
  return (
    <article className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-base font-bold text-neutral-1000 md:text-lg">
          {report.title}
        </h3>
        <p className="text-[11px] text-neutral-700">{formatDateTime(report.createdAt)}</p>
        <p className="mt-2 text-xs leading-relaxed text-neutral-800">
          {truncate(report.description)}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <PriorityBadge priority={report.priority} />
          <StatusBadge status={report.status} />
          <CategoryBadge category={report.category} />
          {report.requiresHumanReview && <ReviewBadge />}
        </div>
      </div>

      <Link
        href={href}
        className="inline-flex shrink-0 items-center justify-center self-stretch rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-800 sm:self-center"
      >
        {actionLabel}
      </Link>
    </article>
  );
}
