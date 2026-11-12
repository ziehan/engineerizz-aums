import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ActionButton } from "./action-button";

/** Kotak pesan inline untuk error, sukses, atau informasi. */
export function Alert({
  tone = "error",
  children,
  className,
}: {
  tone?: "error" | "success" | "info";
  children: ReactNode;
  className?: string;
}) {
  const tones = {
    error: "border-red-200 bg-red-100 text-red-800",
    success: "border-green-300 bg-green-100 text-green-800",
    info: "border-blue-200 bg-blue-100 text-blue-900",
  };
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("rounded-lg border px-3 py-2 text-sm", tones[tone], className)}
    >
      {children}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-neutral-400 bg-white px-4 py-10 text-center text-sm text-neutral-700">
      {message}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-red-200 bg-red-100 px-4 py-8 text-center">
      <p className="text-sm text-red-800">{message}</p>
      {onRetry && (
        <ActionButton size="sm" variant="red" onClick={onRetry}>
          Coba Lagi
        </ActionButton>
      )}
    </div>
  );
}

/** Placeholder kartu saat data sedang dimuat. */
export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3" aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-28 animate-pulse rounded-xl bg-neutral-200" />
      ))}
    </div>
  );
}
