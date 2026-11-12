"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchReport } from "@/lib/api/reports";
import { ApiError } from "@/lib/api/client";
import type { Report } from "@/lib/report-types";

/** Memuat detail satu laporan dan menyediakan `reload`*/
export default function useReport(id: string) {
  const [report, setReport] = useState<Report | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<{ message: string; status: number } | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setReport(await fetchReport(id));
    } catch (e) {
      const status = e instanceof ApiError ? e.status : 0;
      setError({ message: e instanceof Error ? e.message : "Gagal memuat laporan.", status });
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  return { report, isLoading, error, reload: load };
}
