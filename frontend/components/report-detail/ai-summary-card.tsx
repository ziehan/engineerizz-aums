import type { AuditLog, Report } from "@/lib/report-types";

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          return parsed as Record<string, unknown>;
        }
      } catch {
        return null;
      }
    }
  }
  return null;
}

function cleanSentence(text: unknown): string | null {
  if (typeof text !== "string") return null;
  const trimmed = text.trim();
  if (!trimmed || trimmed.startsWith("{") || trimmed.startsWith("[")) return null;

  const intakeMatch = trimmed.match(/^AI Intake completed with validity confidence\s*([\d.]+)/i);
  if (intakeMatch) {
    const raw = Number(intakeMatch[1]);
    const pct = Number.isFinite(raw) ? (raw <= 1 ? Math.round(raw * 100) : Math.round(raw)) : null;
    return pct != null
      ? `Laporan telah divalidasi oleh AI Intake dengan tingkat keyakinan ${pct}% dan dinyatakan layak untuk ditindaklanjuti.`
      : "Laporan telah divalidasi oleh AI Intake dan dinyatakan layak untuk ditindaklanjuti.";
  }

  const planMatch = trimmed.match(/^AI Planning completed for target agency:\s*(.+)/i);
  if (planMatch) {
    return `Rencana penanganan telah disusun oleh AI Planning dan diarahkan ke ${planMatch[1].trim()}.`;
  }

  if (/^Field repair verified successfully by AI vision/i.test(trimmed)) {
    return "Bukti perbaikan lapangan telah diverifikasi oleh AI Vision dan dinyatakan sesuai serta selesai.";
  }

  if (/^Field repair verification rejected by AI vision/i.test(trimmed)) {
    return "Bukti perbaikan lapangan ditolak oleh AI Vision karena belum memenuhi kriteria penyelesaian.";
  }

  const ended = /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
  return ended;
}

function extractFromObject(obj: Record<string, unknown> | null): string | null {
  if (!obj) return null;
  const nested = toRecord(obj.response);
  const candidates = [
    obj.auditNotes,
    obj.dispatchReason,
    obj.dispatchNotes,
    obj.reasoning,
    nested?.auditNotes,
    nested?.dispatchReason,
    nested?.dispatchNotes,
    nested?.reasoning,
  ];
  for (const item of candidates) {
    const cleaned = cleanSentence(item);
    if (cleaned) return cleaned;
  }
  const agency = (nested?.targetAgency ?? obj.targetAgency) as string | undefined;
  const days = (nested?.estimatedDays ?? obj.estimatedDays) as number | undefined;
  if (typeof agency === "string" && agency.trim()) {
    return days != null
      ? `Penanganan laporan diarahkan ke ${agency} dengan estimasi pengerjaan sekitar ${days} hari.`
      : `Penanganan laporan diarahkan ke ${agency}.`;
  }
  return null;
}

export function formatAuditLogSummary(log: AuditLog): string {
  const fromResponse = extractFromObject(toRecord(log.response));
  if (fromResponse) return fromResponse;

  const fromDetailsJson = extractFromObject(toRecord(log.details));
  if (fromDetailsJson) return fromDetailsJson;

  const fromDetailsText = cleanSentence(log.details);
  if (fromDetailsText) return fromDetailsText;

  if (log.agentName === "INTAKE_AGENT") {
    return "Laporan telah dianalisis dan divalidasi oleh AI Intake.";
  }
  if (log.agentName === "PLANNING_AGENT") {
    return "Rencana penanganan telah disusun oleh AI Planning.";
  }
  if (log.agentName === "VERIFICATION_AGENT") {
    return "Bukti perbaikan lapangan telah diperiksa oleh AI Verification.";
  }
  return "Aktivitas pemrosesan AI telah tercatat.";
}

function buildReportSummary(report: Report): string {
  const pieces: string[] = [];
  const addPiece = (value: string | null) => {
    if (!value) return;
    if (!pieces.some((p) => p.toLowerCase() === value.toLowerCase())) {
      pieces.push(value);
    }
  };

  const logs = report.auditLogs ?? [];
  const intakeLog = logs.find(
    (l) => l.agentName === "INTAKE_AGENT" || l.action === "AI_INTAKE_COMPLETED" || l.action === "AI_VALIDATED",
  );
  const planLog = logs.find(
    (l) => l.agentName === "PLANNING_AGENT" || l.action === "AI_PLANNING_COMPLETED" || l.action === "AI_PLANNED",
  );
  const verifyLog = logs.find(
    (l) =>
      l.agentName === "VERIFICATION_AGENT" ||
      l.action === "FIELD_VERIFIED" ||
      l.action === "FIELD_VERIFICATION_REJECTED" ||
      l.action === "AI_FIELD_VERIFIED" ||
      l.action === "AI_FIELD_VERIFICATION_REJECTED",
  );

  if (intakeLog) {
    addPiece(
      extractFromObject(toRecord(intakeLog.response)) ??
        extractFromObject(toRecord(intakeLog.details)),
    );
  }

  const metaReason =
    cleanSentence(report.actionPlan?.confidenceMetadata?.dispatchReason) ??
    cleanSentence(report.actionPlan?.confidenceMetadata?.reasoning);
  if (metaReason) {
    addPiece(metaReason);
  } else if (planLog) {
    addPiece(
      extractFromObject(toRecord(planLog.response)) ??
        extractFromObject(toRecord(planLog.details)),
    );
  }

  if (verifyLog) {
    addPiece(
      extractFromObject(toRecord(verifyLog.response)) ??
        extractFromObject(toRecord(verifyLog.details)),
    );
  }

  if (pieces.length === 0) {
    for (const log of logs) {
      const extracted =
        extractFromObject(toRecord(log.response)) ??
        extractFromObject(toRecord(log.details)) ??
        cleanSentence(log.details);
      if (extracted) {
        addPiece(extracted);
        break;
      }
    }
  }

  if (pieces.length > 0) {
    return pieces.join(" ");
  }

  if (report.actionPlan) {
    return `Berdasarkan analisis AI, laporan kategori ${report.category} ini ditugaskan ke ${report.actionPlan.targetAgency} dengan estimasi penyelesaian sekitar ${report.actionPlan.estimatedDays} hari kerja.`;
  }

  if (report.aiProcessed) {
    return `Laporan kategori ${report.category} telah dianalisis oleh sistem AI dengan tingkat prioritas ${report.priority} dan siap untuk ditindaklanjuti.`;
  }

  return "Laporan ini belum melalui analisis AI.";
}

function confidenceText(report: Report): string {
  const score =
    report.actionPlan?.confidenceScore ??
    report.auditLogs?.find((l) => l.confidenceScore != null)?.confidenceScore;
  if (score == null) return "-";
  const pct = score <= 1 ? Math.round(score * 100) : Math.round(score);
  return `${pct}%`;
}

export function AiSummaryCard({ report }: { report: Report }) {
  const summary = buildReportSummary(report);

  return (
    <section className="rounded-2xl bg-blue-100 p-5 shadow-sm md:p-6">
      <h2 className="text-base font-bold text-neutral-1000 md:text-lg">AI Summary</h2>
      <dl className="mt-3 text-xs text-neutral-900 md:text-sm">
        <div className="flex gap-2">
          <dt className="w-24">Confidence</dt>
          <dd className="font-semibold">: {confidenceText(report)}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-24">Duplikasi</dt>
          <dd className="font-semibold">: {report.duplicateCount ?? 0} laporan</dd>
        </div>
      </dl>
      <p className="mt-3 text-xs leading-relaxed text-neutral-800 md:text-sm">{summary}</p>
    </section>
  );
}
