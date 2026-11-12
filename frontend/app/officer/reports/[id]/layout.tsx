"use client";

import type { ReactNode } from "react";
import { useParams, usePathname } from "next/navigation";
import { OfficerReportDetail } from "@/components/officer/officer-report-detail";

/**
 * Layout bersama untuk /officer/reports/[id], /plan, dan /verify.
 * Detail laporan tetap termount saat berpindah route
 * Planning/Verifying muncul tanpa memuat ulang data dan modal ditentukan dari path.
 */
export default function OfficerReportLayout({ children }: { children: ReactNode }) {
  const { id } = useParams<{ id: string }>();
  const pathname = usePathname();

  const modal = pathname.endsWith("/plan")
    ? "plan"
    : pathname.endsWith("/verify")
      ? "verify"
      : undefined;

  return (
    <>
      <OfficerReportDetail id={id} modal={modal} />
      {children}
    </>
  );
}
