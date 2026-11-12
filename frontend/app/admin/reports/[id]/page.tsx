"use client";

import { useParams } from "next/navigation";
import { AdminReportDetail } from "@/components/admin/admin-report-detail";

/** /admin/reports/[id] : detail lengkap satu laporan. */
export default function AdminReportPage() {
  const { id } = useParams<{ id: string }>();
  return <AdminReportDetail id={id} />;
}
