import type { Priority, Report, ReportStatus } from "./report-types";

/** Label status sesuai dokumentasi API. */
export const STATUS_LABEL: Record<ReportStatus, string> = {
  Pending: "Menunggu Proses",
  PENDING_AI: "Menunggu Analisis AI",
  Approved: "Disetujui",
  In_Progress: "Sedang Ditangani",
  Resolved: "Selesai",
  Rejected: "Ditolak",
};

export const STATUS_STYLE: Record<ReportStatus, string> = {
  Pending: "bg-amber-300 text-neutral-1000",
  PENDING_AI: "bg-neutral-300 text-neutral-1000",
  Approved: "bg-blue-200 text-blue-900",
  In_Progress: "bg-blue-600 text-white",
  Resolved: "bg-priority-low text-neutral-1000",
  Rejected: "bg-neutral-900 text-white",
};

export const PRIORITY_STYLE: Record<Priority, string> = {
  High: "bg-priority-high text-white",
  Medium: "bg-priority-medium text-neutral-1000",
  Low: "bg-priority-low text-neutral-1000",
};

export const PRIORITY_COLOR: Record<Priority, string> = {
  High: "#FF2F2F",
  Medium: "#F5B800",
  Low: "#3FBF3F",
};

export const STATUS_OPTIONS = (Object.keys(STATUS_LABEL) as ReportStatus[]).map(
  (value) => ({ value, label: STATUS_LABEL[value] }),
);

export const PRIORITY_OPTIONS = (["High", "Medium", "Low"] as Priority[]).map(
  (value) => ({ value, label: value }),
);

export const isResolved = (r: Report) => r.status === "Resolved";
export const isInProgress = (r: Report) =>
  r.status === "Approved" || r.status === "In_Progress";
export const needsReview = (r: Report) =>
  r.requiresHumanReview === true ||
  r.status === "Pending" ||
  r.status === "PENDING_AI";

export function categoryOptions(reports: Report[]) {
  return Array.from(new Set(reports.map((r) => r.category)))
    .filter(Boolean)
    .sort()
    .map((value) => ({ value, label: value }));
}
