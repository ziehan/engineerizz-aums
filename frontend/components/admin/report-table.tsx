import Link from "next/link";
import { CategoryBadge, PriorityBadge, ReviewBadge, StatusBadge } from "@/components/ui/badges";
import { formatDateTime } from "@/lib/format";
import type { Report } from "@/lib/report-types";

/** Tabel seluruh laporan (tampil pada layar yg lebih besar dari md). */
export function ReportTable({ reports }: { reports: Report[] }) {
  const th = "px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-neutral-800";

  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
      <table className="w-full min-w-[48rem] text-sm">
        <thead className="bg-neutral-200">
          <tr>
            <th className={th}>Judul</th>
            <th className={th}>Kategori</th>
            <th className={th}>Prioritas</th>
            <th className={th}>Status</th>
            <th className={th}>Dibuat</th>
            <th className={th} />
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200">
          {reports.map((r) => (
            <tr key={r.id} className="hover:bg-neutral-100">
              <td className="max-w-xs px-4 py-3">
                <p className="truncate font-semibold">{r.title}</p>
                <p className="truncate text-xs text-neutral-700">{r.locationAddress}</p>
                {r.isDuplicate && <span className="text-[11px] font-semibold text-red-700">Duplikat</span>}
              </td>
              <td className="px-4 py-3">
                <CategoryBadge category={r.category} />
              </td>
              <td className="px-4 py-3">
                <PriorityBadge priority={r.priority} />
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-col items-start gap-1">
                  <StatusBadge status={r.status} />
                  {r.requiresHumanReview && <ReviewBadge />}
                </div>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-xs text-neutral-800">
                {formatDateTime(r.createdAt)}
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/admin/reports/${r.id}`}
                  className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-800"
                >
                  Detail
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
