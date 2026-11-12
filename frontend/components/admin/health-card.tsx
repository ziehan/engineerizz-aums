"use client";

import { useCallback, useEffect, useState } from "react";
import { ActionButton } from "@/components/ui/action-button";
import { fetchHealth } from "@/lib/api/admin";
import { cn } from "@/lib/utils";
import type { HealthStatus } from "@/lib/report-types";

const REFRESH_MS = 30_000;

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h} jam ${m} menit` : `${m} menit`;
}

/** Kartu status layanan & database dari endpoint /health (diperbarui otomatis). */
export function HealthCard() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [unreachable, setUnreachable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setHealth(await fetchHealth());
      setUnreachable(false);
    } catch {
      setUnreachable(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  const dbUp = health?.database === "up";
  const label = unreachable
    ? "Server tidak dapat dihubungi"
    : dbUp
      ? "Database sehat"
      : "Layanan terdegradasi — database bermasalah";

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-bold md:text-lg">Status Sistem</h2>
        <ActionButton size="sm" variant="neutral" onClick={load} disabled={isLoading}>
          {isLoading ? "Memeriksa..." : "Periksa"}
        </ActionButton>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <span
          className={cn(
            "h-3.5 w-3.5 shrink-0 rounded-full",
            isLoading && !health ? "animate-pulse bg-neutral-400" : dbUp ? "bg-green-500" : "bg-red-600",
          )}
        />
        <p className="text-sm font-semibold">{isLoading && !health ? "Memeriksa..." : label}</p>
      </div>

      {health && (
        <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-neutral-800">
          <div>
            <dt className="text-neutral-600">Layanan</dt>
            <dd className="font-semibold">{health.service}</dd>
          </div>
          <div>
            <dt className="text-neutral-600">Uptime</dt>
            <dd className="font-semibold">{formatUptime(health.uptime)}</dd>
          </div>
        </dl>
      )}
    </section>
  );
}
