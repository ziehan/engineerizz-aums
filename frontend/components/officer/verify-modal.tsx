"use client";

import { useCallback, useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { ActionButton } from "@/components/ui/action-button";
import { Alert } from "@/components/ui/feedback";
import { Field, TextArea } from "@/components/ui/form-fields";
import { ImageDropzone } from "@/components/ui/image-dropzone";
import { ApiError } from "@/lib/api/client";
import { verifyReport } from "@/lib/api/reports";
import { getCoordinates, stampWatermark, type Coordinates } from "@/lib/geo";
import { clearDraft, getDraft, saveDraft, type VerifyDraft } from "@/lib/task-store";
import type { Report } from "@/lib/report-types";

interface VerifyModalProps {
  report: Report;
  userId: string;
  onClose: () => void;
  onVerified: () => void;
}

type Outcome = { tone: "success" | "info"; message: string };

/** Pesan khusus untuk error verifikasi yang umum terjadi di lapangan. */
function describeError(e: unknown): string {
  if (e instanceof ApiError && e.status === 422) {
    return `${e.message} Laporan ditandai untuk review manual supervisor.`;
  }
  return e instanceof Error ? e.message : "Verifikasi gagal dikirim.";
}

/** Modal "Verifying": foto bukti + GPS (geofencing) + catatan audit. */
export function VerifyModal({ report, userId, onClose, onVerified }: VerifyModalProps) {
  const [photo, setPhoto] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [gpsError, setGpsError] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState("");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [notice, setNotice] = useState("");

  /** Meminta izin GPS sejak modal dibuka */
  const locate = useCallback(async () => {
    setGpsError("");
    try {
      setCoords(await getCoordinates());
    } catch (e) {
      setCoords(null);
      setGpsError(e instanceof Error ? e.message : "Lokasi tidak tersedia.");
    }
  }, []);

  useEffect(() => {
    setNotes(getDraft<VerifyDraft>(userId, report.id, "verify")?.notes ?? "");
    locate();
  }, [locate, report.id, userId]);

  const handleSave = () => {
    saveDraft(userId, report.id, "verify", { notes });
    setError("");
    setNotice("Catatan tersimpan sebagai draf. Foto perlu dipilih ulang.");
  };

  const handleSubmit = async () => {
    if (!photo) return setError("Pilih atau ambil foto hasil perbaikan terlebih dahulu.");
    setIsBusy(true);
    setError("");
    setNotice("");
    setOutcome(null);
    try {
      // Koordinat diambil ulang saat submit agar selalu terbaru.
      const position = await getCoordinates();
      setCoords(position);
      const stamped = await stampWatermark(photo, position.latitude, position.longitude);

      const form = new FormData();
      form.append("latitude", String(position.latitude));
      form.append("longitude", String(position.longitude));
      if (notes.trim()) form.append("auditNotes", notes.trim());
      form.append("image", stamped);

      const res = await verifyReport(report.id, form);
      clearDraft(userId, report.id, "verify");

      setOutcome(
        res.data?.requiresHumanReview
          ? { tone: "info", message: "Bukti belum memenuhi ambang AI. Laporan masuk status Dalam Review Admin." }
          : { tone: "success", message: "Verifikasi berhasil. Laporan ditandai selesai." },
      );
    } catch (e) {
      setError(describeError(e));
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <Modal title="Verifying" onClose={outcome?.tone === "success" ? onVerified : onClose}>
      <p className="mb-4 text-xs text-neutral-800">
        Unggah foto kondisi setelah perbaikan. Foto akan diberi stempel koordinat dan waktu, dan
        Anda harus berada maksimal 100 meter dari titik laporan.
      </p>

      <div className="grid gap-3">
        <ImageDropzone file={photo} onChange={setPhoto} disabled={isBusy || !!outcome} />

        <p className="text-xs text-neutral-800">
          {coords ? (
            <>📍 {coords.latitude}, {coords.longitude} (±{coords.accuracy} m)</>
          ) : gpsError ? (
            <span className="text-red-700">
              {gpsError}{" "}
              <button type="button" className="cursor-pointer font-semibold underline" onClick={locate}>
                Coba lagi
              </button>
            </span>
          ) : (
            "Mencari lokasi GPS..."
          )}
        </p>

        <Field label="Catatan audit (opsional)" hint={`${notes.length}/500`}>
          <TextArea
            rows={3}
            maxLength={500}
            placeholder="Contoh: Aspal telah ditambal rata dan dipadatkan."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isBusy || !!outcome}
          />
        </Field>

        {error && <Alert>{error}</Alert>}
        {notice && <Alert tone="success">{notice}</Alert>}
        {outcome && <Alert tone={outcome.tone}>{outcome.message}</Alert>}
      </div>

      {outcome ? (
        <ActionButton className="mt-5 w-full" onClick={onVerified}>
          Tutup
        </ActionButton>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-3">
          <ActionButton variant="blue" onClick={handleSave} disabled={isBusy}>
            Simpan
          </ActionButton>
          <ActionButton variant="green" onClick={handleSubmit} disabled={isBusy}>
            {isBusy ? "Memverifikasi..." : "Kirim"}
          </ActionButton>
        </div>
      )}
    </Modal>
  );
}
