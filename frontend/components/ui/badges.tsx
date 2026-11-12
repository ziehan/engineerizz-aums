import { cn } from "@/lib/utils";
import {
  PRIORITY_STYLE,
  STATUS_LABEL,
  STATUS_STYLE,
} from "@/lib/report-labels";
import type { Priority, ReportStatus } from "@/lib/report-types";

const BASE = "inline-flex items-center rounded px-2.5 py-0.5 text-[11px] font-semibold";

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <span className={cn(BASE, PRIORITY_STYLE[priority])}>{priority}</span>;
}

export function StatusBadge({ status }: { status: ReportStatus }) {
  return (
    <span className={cn(BASE, STATUS_STYLE[status])}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function CategoryBadge({ category }: { category: string }) {
  return (
    <span className={cn(BASE, "border border-neutral-1000 bg-white text-neutral-1000")}>
      {category}
    </span>
  );
}

export function ReviewBadge() {
  return <span className={cn(BASE, "bg-red-100 text-red-800")}>Dalam Review Admin</span>;
}
