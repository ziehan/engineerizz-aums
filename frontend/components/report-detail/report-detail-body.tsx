"use client";

import { useMemo, type ReactNode } from "react";
import { ReportMap } from "@/components/map/report-map";
import type { Report } from "@/lib/report-types";
import { AgentLog } from "./agent-log";
import { AiSummaryCard } from "./ai-summary-card";
import { DetailHeader } from "./detail-header";
import { PlanCard } from "./plan-card";
import { ReportPhotos } from "./report-photos";

interface ReportDetailBodyProps {
  report: Report;
  actions?: ReactNode;
  extra?: ReactNode;
  planFooter?: ReactNode;
  logsRestricted?: boolean;
}

/**
 * Susunan halaman detail laporan yang dipakai bersama oleh petugas dan admin:
 */
export function ReportDetailBody({
  report,
  actions,
  extra,
  planFooter,
  logsRestricted,
}: ReportDetailBodyProps) {
  const points = useMemo(
    () => [
      {
        id: report.id,
        title: report.title,
        latitude: report.latitude,
        longitude: report.longitude,
        priority: report.priority,
      },
    ],
    [report.id, report.title, report.latitude, report.longitude, report.priority],
  );

  return (
    <div className="flex flex-col gap-8">
      <DetailHeader report={report} actions={actions} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <ReportMap points={points} className="h-64 md:h-80" />
          <ReportPhotos report={report} />
        </div>
        <div className="flex flex-col gap-4">
          <AiSummaryCard report={report} />
          <PlanCard report={report} footer={planFooter} />
          {extra}
        </div>
      </div>

      <AgentLog logs={report.auditLogs} restricted={logsRestricted} />
    </div>
  );
}
