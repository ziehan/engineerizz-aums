"use client";

import { useCallback, useEffect, useState } from "react";
import { claimReport, getClaimedIds, getDraftReportIds } from "@/lib/task-store";

/** Daftar tugas yang diambil petugas serta ID laporan yang memiliki draf. */
export default function useTaskStore(userId: string) {
  const [claimedIds, setClaimedIds] = useState<string[]>([]);
  const [draftIds, setDraftIds] = useState<string[]>([]);

  const refresh = useCallback(() => {
    setClaimedIds(getClaimedIds(userId));
    setDraftIds(getDraftReportIds(userId));
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const claim = (reportId: string) => setClaimedIds(claimReport(userId, reportId));

  return { claimedIds, draftIds, claim, refresh };
}
