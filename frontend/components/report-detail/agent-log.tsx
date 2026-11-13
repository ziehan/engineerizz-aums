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

function formatJson(data: unknown): string {
  if (data == null) return "null";
  if (typeof data === "string") {
    try {
      return JSON.stringify(JSON.parse(data), null, 2);
    } catch {
      return data;
    }
  }
  return JSON.stringify(data, null, 2);
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
            <article
              key={key}
              className="flex flex-col justify-between rounded-2xl bg-neutral-1000 p-4 text-white md:p-5"
            >
              <div>
                <h3 className="text-sm font-bold">{label}</h3>
                {agentLogs.length > 0 ? (
                  <ul className="mt-3 space-y-3 text-xs leading-relaxed text-neutral-300">
                    {agentLogs.map((log) => (
                      <li
                        key={log.id}
                        className="border-b border-neutral-800 pb-3 last:border-b-0 last:pb-0"
                      >
                        <p className="font-medium text-neutral-200">
                          {log.details}
                        </p>
                        <p className="mt-1 text-[10px] text-neutral-500">
                          {formatDateTime(log.timestamp)}
                          {log.confidenceScore != null &&
                            ` · ${Math.round(log.confidenceScore * 100)}%`}
                        </p>

                        {log.response && (
                          <details className="group mt-2.5 rounded-lg border border-neutral-800 bg-neutral-900 text-[11px] overflow-hidden">
                            <summary className="flex cursor-pointer items-center justify-between px-3 py-1.5 font-mono text-[11px] text-blue-400 hover:text-blue-300 hover:bg-neutral-800/60 select-none transition-colors">
                              <span className="flex items-center gap-1.5 font-semibold">
                                <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-400" />
                                JSON Response
                              </span>
                              <span className="text-[10px] text-neutral-400 transition-transform duration-200 group-open:rotate-180">
                                ▼
                              </span>
                            </summary>
                            <div className="max-h-60 overflow-x-auto overflow-y-auto border-t border-neutral-800 bg-neutral-950 p-3">
                              <pre className="font-mono text-[10px] text-emerald-400 leading-relaxed whitespace-pre-wrap break-all">
                                {formatJson(log.response)}
                              </pre>
                            </div>
                          </details>
                        )}

                        {log.payload && (
                          <details className="group mt-1.5 rounded-lg border border-neutral-800 bg-neutral-900 text-[11px] overflow-hidden">
                            <summary className="flex cursor-pointer items-center justify-between px-3 py-1.5 font-mono text-[11px] text-neutral-400 hover:text-neutral-300 hover:bg-neutral-800/60 select-none transition-colors">
                              <span className="flex items-center gap-1.5">
                                <span className="inline-block h-1.5 w-1.5 rounded-full bg-neutral-500" />
                                Payload Input
                              </span>
                              <span className="text-[10px] text-neutral-500 transition-transform duration-200 group-open:rotate-180">
                                ▼
                              </span>
                            </summary>
                            <div className="max-h-60 overflow-x-auto overflow-y-auto border-t border-neutral-800 bg-neutral-950 p-3">
                              <pre className="font-mono text-[10px] text-neutral-300 leading-relaxed whitespace-pre-wrap break-all">
                                {formatJson(log.payload)}
                              </pre>
                            </div>
                          </details>
                        )}
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
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
