import type { Report } from "@/lib/report-types";

interface BreakdownCardProps {
  title: string;
  /** Pasangan label : warna batang Tailwind. */
  rows: { label: string; count: number; color: string }[];
}

function BreakdownCard({ title, rows }: BreakdownCardProps) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-bold md:text-lg">{title}</h2>
      <ul className="mt-3 space-y-2">
        {rows.map((row) => (
          <li key={row.label} className="text-xs text-neutral-800">
            <div className="flex justify-between">
              <span>{row.label}</span>
              <span className="font-semibold">{row.count}</span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-neutral-200">
              <div
                className={`h-2 rounded-full ${row.color}`}
                style={{ width: `${(row.count / max) * 100}%` }}
              />
            </div>
          </li>
        ))}
        {rows.length === 0 && <li className="text-xs text-neutral-600">Belum ada data.</li>}
      </ul>
    </section>
  );
}

const count = (reports: Report[], pick: (r: Report) => string, value: string) =>
  reports.filter((r) => pick(r) === value).length;

/** Dua kartu distribusi laporan: per prioritas dan per kategori. */
export function ReportBreakdown({ reports }: { reports: Report[] }) {
  const categories = Array.from(new Set(reports.map((r) => r.category))).sort();

  return (
    <>
      <BreakdownCard
        title="Berdasarkan Prioritas"
        rows={[
          { label: "High", count: count(reports, (r) => r.priority, "High"), color: "bg-priority-high" },
          { label: "Medium", count: count(reports, (r) => r.priority, "Medium"), color: "bg-priority-medium" },
          { label: "Low", count: count(reports, (r) => r.priority, "Low"), color: "bg-priority-low" },
        ]}
      />
      <BreakdownCard
        title="Berdasarkan Kategori"
        rows={categories.map((c) => ({
          label: c,
          count: count(reports, (r) => r.category, c),
          color: "bg-blue-600",
        }))}
      />
    </>
  );
}
