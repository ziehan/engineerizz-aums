"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchReports } from "@/lib/api/reports";
import type { Report } from "@/lib/report-types";

/** Memuat seluruh laporan sekali, beserta state loading/error/reload. */
export default function useReportList() {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      setReports(await fetchReports());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat laporan.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { reports, isLoading, error, reload: load, setReports };
}
