import type { ReactNode } from "react";
import { ReviewBadge, StatusBadge, PriorityBadge, CategoryBadge } from "@/components/ui/badges";
import { formatDateTime } from "@/lib/format";
import type { Report } from "@/lib/report-types";

/** Judul, pembuat, tanggal, deskripsi, dan lokasi laporan + slot tombol aksi. */
export function DetailHeader({ report, actions }: { report: Report; actions?: ReactNode }) {
  return (
    <header>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-bold text-neutral-1000 md:text-4xl">
            {report.title}
          </h1>
          <p className="text-sm font-semibold text-neutral-800 md:text-base">
            oleh {report.reporter?.name ?? "Warga"}
          </p>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <PriorityBadge priority={report.priority} />
        <StatusBadge status={report.status} />
        <CategoryBadge category={report.category} />
        {report.requiresHumanReview && <ReviewBadge />}
      </div>

      <p className="mt-4 text-xs font-semibold text-neutral-900 md:text-sm">
        Dibuat pada {formatDateTime(report.createdAt)}
      </p>
      <p className="mt-1 max-w-4xl whitespace-pre-line text-xs leading-relaxed text-neutral-800 md:text-sm">
        {report.description}
      </p>
      <p className="mt-4 text-xs font-semibold text-neutral-900 md:text-sm">
        Lokasi: <span className="font-normal">{report.locationAddress || "-"}</span>
      </p>
    </header>
  );
}
