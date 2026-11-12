import { formatDateTime } from "@/lib/format";
import type { AuditLog } from "@/lib/report-types";

const AGENTS = [
  { key: "INTAKE_AGENT", label: "Intake Agent" },
  { key: "PLANNING_AGENT", label: "Planning Agent" },
  { key: "VERIFICATION_AGENT", label: "Verification Agent" },
];

interface AgentLogProps {
  logs?: AuditLog[];
  /** Backend mengosongkan log untuk role selain CRM/Admin. */
  restricted?: boolean;
}

/** Log tiga agen AI (Intake, Planning, Verification). */
export function AgentLog({ logs = [], restricted }: AgentLogProps) {
  return (
    <section className="rounded-2xl bg-blue-900 p-5 md:p-8">
      <h2 className="text-base font-bold text-white md:text-lg">Log Agent</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {AGENTS.map(({ key, label }) => {
          const agentLogs = logs.filter((l) => l.agentName === key);
          return (
            <article key={key} className="rounded-2xl bg-neutral-1000 p-4 text-white md:p-5">
              <h3 className="text-sm font-bold">{label}</h3>
              {agentLogs.length > 0 ? (
                <ul className="mt-2 space-y-2 text-xs leading-relaxed text-neutral-300">
                  {agentLogs.map((log) => (
                    <li key={log.id}>
                      <p>{log.details}</p>
                      <p className="text-[10px] text-neutral-500">
                        {formatDateTime(log.timestamp)}
                        {log.confidenceScore != null &&
                          ` · ${Math.round(log.confidenceScore * 100)}%`}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-neutral-400">
                  {restricted
                    ? "Log agen hanya dapat dilihat oleh admin."
                    : "Belum ada aktivitas dari agen ini."}
                </p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
