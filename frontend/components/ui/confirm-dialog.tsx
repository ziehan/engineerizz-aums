"use client";

import type { ReactNode } from "react";
import { Modal } from "./modal";
import { ActionButton } from "./action-button";

interface ConfirmDialogProps {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  tone?: "blue" | "red";
  isBusy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Dialog konfirmasi untuk aksi penting (setujui / hapus). */
export function ConfirmDialog({
  title,
  children,
  confirmLabel,
  tone = "blue",
  isBusy,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal title={title} onClose={onCancel}>
      <div className="text-center text-sm text-neutral-800">{children}</div>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <ActionButton variant="neutral" onClick={onCancel} disabled={isBusy}>
          Batal
        </ActionButton>
        <ActionButton variant={tone} onClick={onConfirm} disabled={isBusy}>
          {isBusy ? "Memproses..." : confirmLabel}
        </ActionButton>
      </div>
    </Modal>
  );
}
