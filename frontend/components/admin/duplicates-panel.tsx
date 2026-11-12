"use client";

import { useState } from "react";
import Link from "next/link";
import { ActionButton } from "@/components/ui/action-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Alert } from "@/components/ui/feedback";
import { PriorityBadge, StatusBadge } from "@/components/ui/badges";
import { deleteDuplicate } from "@/lib/api/reports";
import type { Report } from "@/lib/report-types";

interface DuplicatesPanelProps {
  report: Report;
  onChanged: () => void;
}

/** Daftar laporan duplikat yang tertaut ke laporan utama, beserta aksi hapus duplikat. */
export function DuplicatesPanel({ report, onChanged }: DuplicatesPanelProps) {
  const [target, setTarget] = useState<Report | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState("");

  const duplicates = report.duplicates ?? [];

  const handleDelete = async () => {
    if (!target) return;
    setIsBusy(true);
    setError("");
    try {
      await deleteDuplicate(target.id);
      setTarget(null);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menghapus duplikat.");
      setTarget(null);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-neutral-300 bg-white p-5 shadow-sm">
      <h2 className="text-base font-bold md:text-lg">Laporan Duplikat ({duplicates.length})</h2>
      {report.isDuplicate && (
        <Alert tone="info" className="mt-3">
          Laporan ini ditandai sebagai duplikat dari laporan lain.
        </Alert>
      )}
      {error && <Alert className="mt-3">{error}</Alert>}

      {duplicates.length === 0 ? (
        <p className="mt-3 text-xs text-neutral-700">Tidak ada laporan duplikat.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {duplicates.map((d) => (
            <li
              key={d.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-neutral-200 p-3"
            >
              <Link
                href={`/admin/reports/${d.id}`}
                className="min-w-0 flex-1 truncate text-sm font-semibold hover:underline"
              >
                {d.title}
              </Link>
              <PriorityBadge priority={d.priority} />
              <StatusBadge status={d.status} />
              <ActionButton size="sm" variant="red" onClick={() => setTarget(d)}>
                Hapus duplikat
              </ActionButton>
            </li>
          ))}
        </ul>
      )}

      {target && (
        <ConfirmDialog
          title="Hapus Duplikat"
          confirmLabel="Hapus Duplikat"
          tone="red"
          isBusy={isBusy}
          onConfirm={handleDelete}
          onCancel={() => setTarget(null)}
        >
          Tautan duplikat <strong>{target.title}</strong> akan dihapus. Laporan utama tidak terpengaruh.
        </ConfirmDialog>
      )}
    </section>
  );
}
