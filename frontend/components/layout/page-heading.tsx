import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Pembungkus judul halaman agar konsisten di seluruh halaman internal. */
export function PageHeading({
  title,
  subtitle,
  action,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-neutral-1000 md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-neutral-800">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
