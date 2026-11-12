"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { ActionButton } from "@/components/ui/action-button";
import { Alert } from "@/components/ui/feedback";
import { Field, SelectField, TextArea, TextField } from "@/components/ui/form-fields";
import { fetchDepartments } from "@/lib/api/admin";
import { requestPlan } from "@/lib/api/reports";
import { clearDraft, getDraft, saveDraft, type PlanDraft } from "@/lib/task-store";
import type { Department, Report } from "@/lib/report-types";

interface PlanModalProps {
  report: Report;
  userId: string;
  onClose: () => void;
  onSubmitted: () => void;
}

/** Nilai awal form: draf lokal diprioritaskan, lalu rencana yang sudah ada. */
function initialValues(report: Report, userId: string): PlanDraft {
  const draft = getDraft<PlanDraft>(userId, report.id, "plan");
  if (draft) return draft;
  const plan = report.actionPlan;
  return {
    agency: plan?.targetAgency ?? "",
    days: plan ? String(plan.estimatedDays) : "",
    detail: plan?.actionSteps.join("\n") ?? "",
  };
}

/** Modal "Planning": menyusun rencana penanganan lalu mengirimkannya ke sistem. */
export function PlanModal({ report, userId, onClose, onSubmitted }: PlanModalProps) {
  const [values, setValues] = useState<PlanDraft>({ agency: "", days: "", detail: "" });
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setValues(initialValues(report, userId));
    fetchDepartments().then(setDepartments).catch(() => setDepartments([]));
  }, [report, userId]);

  const update = (name: keyof PlanDraft, value: string) =>
    setValues((prev) => ({ ...prev, [name]: value }));

  const handleSave = () => {
    saveDraft(userId, report.id, "plan", values);
    setError("");
    setNotice("Draf tersimpan di perangkat ini.");
  };

  const handleSubmit = async () => {
    setIsBusy(true);
    setError("");
    setNotice("");
    try {
      await requestPlan(report.id);
      clearDraft(userId, report.id, "plan");
      onSubmitted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengirim rencana.");
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <Modal title="Planning" onClose={onClose}>
      <p className="mb-4 text-xs text-neutral-800">
        Tuliskan planning untuk menangani aduan ini. Pastikan warga dapat memahami serta planning
        sesuai dengan masalah dan dapat dilaksanakan.
      </p>

      <div className="grid gap-3">
        <div className="grid grid-cols-[1fr_6rem_auto] items-end gap-2">
          <Field label="Instansi yang dipilih">
            <SelectField value={values.agency} onChange={(e) => update("agency", e.target.value)}>
              <option value="">Pilih instansi</option>
              {values.agency && !departments.some((d) => d.name === values.agency) && (
                <option value={values.agency}>{values.agency}</option>
              )}
              {departments.map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name}
                </option>
              ))}
            </SelectField>
          </Field>
          <Field label="Estimasi">
            <TextField
              type="number"
              min={0}
              value={values.days}
              onChange={(e) => update("days", e.target.value)}
            />
          </Field>
          <span className="pb-2 text-sm">hari</span>
        </div>

        <Field label="Detail Plan">
          <TextArea
            rows={7}
            placeholder="Tuliskan langkah kerja, satu langkah per baris"
            value={values.detail}
            onChange={(e) => update("detail", e.target.value)}
          />
        </Field>

        <Alert tone="info">
          Saat dikirim, sistem AI menyusun rencana final (instansi, estimasi, dan langkah kerja)
          berdasarkan data aduan. Isian Anda tersimpan sebagai draf acuan.
        </Alert>
        {error && <Alert>{error}</Alert>}
        {notice && <Alert tone="success">{notice}</Alert>}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <ActionButton variant="blue" onClick={handleSave} disabled={isBusy}>
          Simpan
        </ActionButton>
        <ActionButton variant="green" onClick={handleSubmit} disabled={isBusy}>
          {isBusy ? "Mengirim..." : "Kirim"}
        </ActionButton>
      </div>
    </Modal>
  );
}
