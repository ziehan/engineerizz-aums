import { cn } from "@/lib/utils";

export type StatTone = "blue" | "amber" | "red" | "green" | "neutral";

const TONES: Record<StatTone, { box: string; title: string; value: string }> = {
  blue: { box: "bg-blue-100", title: "text-blue-900", value: "text-blue-1000" },
  amber: { box: "bg-amber-100", title: "text-amber-700", value: "text-amber-700" },
  red: { box: "bg-red-100", title: "text-red-700", value: "text-red-700" },
  green: { box: "bg-green-100", title: "text-green-700", value: "text-green-700" },
  neutral: { box: "bg-neutral-200", title: "text-neutral-900", value: "text-neutral-1000" },
};

interface StatCardProps {
  title: string;
  value: string;
  tone: StatTone;
  className?: string;
}

/** Kartu ringkasan angka berwarna pada dashboard. */
export function StatCard({ title, value, tone, className }: StatCardProps) {
  const t = TONES[tone];
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-1 rounded-2xl px-4 py-4 shadow-md md:gap-2 md:py-6",
        t.box,
        className,
      )}
    >
      <p className={cn("text-center text-sm font-bold md:text-base", t.title)}>{title}</p>
      <p className={cn("text-3xl font-bold md:text-4xl", t.value)}>{value}</p>
    </div>
  );
}
