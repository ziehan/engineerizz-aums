"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ActionButton } from "@/components/ui/action-button";
import { Alert } from "@/components/ui/feedback";
import { Field, SelectField, TextField } from "@/components/ui/form-fields";
import { createStaff, fetchDepartments, type CreateStaffPayload } from "@/lib/api/admin";
import type { Department } from "@/lib/report-types";
import type { User } from "@/lib/types";

const EMPTY = {
  name: "",
  email: "",
  password: "",
  role: "FIELD_OFFICER" as CreateStaffPayload["role"],
  nip: "",
  unit: "",
  phone: "",
  departmentId: "",
};

interface StaffFormProps {
  onCreated: (user: User) => void;
}

/** Form pembuatan akun petugas lapangan atau admin (POST /auth/officers). */
export function StaffForm({ onCreated }: StaffFormProps) {
  const [values, setValues] = useState(EMPTY);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchDepartments().then(setDepartments).catch(() => setDepartments([]));
  }, []);

  const set = (name: keyof typeof EMPTY) =>
    (e: { target: { value: string } }) =>
      setValues((prev) => ({ ...prev, [name]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (values.password.length < 8) {
      return setError("Password minimal 8 karakter.");
    }

    // Field opsional yang kosong tidak dikirim agar lolos validasi backend.
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const payload: CreateStaffPayload = {
      name: values.name.trim(),
      email: values.email.trim(),
      password: values.password,
      role: values.role,
      ...(values.nip.trim() && { nip: values.nip.trim() }),
      ...(values.unit.trim() && { unit: values.unit.trim() }),
      ...(values.phone.trim() && { phone: values.phone.trim() }),
      ...(isUuid.test(values.departmentId) && { departmentId: values.departmentId }),
    };

    setIsBusy(true);
    try {
      const user = await createStaff(payload);
      onCreated(user);
      setSuccess(`Akun ${user.name} (${user.role}) berhasil dibuat.`);
      setValues(EMPTY);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat akun.");
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:grid-cols-2 md:p-6"
    >
      <Field label="Nama lengkap *">
        <TextField required maxLength={150} value={values.name} onChange={set("name")} />
      </Field>
      <Field label="Email *">
        <TextField required type="email" value={values.email} onChange={set("email")} />
      </Field>
      <Field label="Password *" hint="Minimal 8 karakter">
        <TextField
          required
          type="password"
          minLength={8}
          autoComplete="new-password"
          value={values.password}
          onChange={set("password")}
        />
      </Field>
      <Field label="Role *">
        <SelectField value={values.role} onChange={set("role")}>
          <option value="FIELD_OFFICER">Petugas Lapangan</option>
          <option value="ADMIN">Admin</option>
        </SelectField>
      </Field>
      <Field label="NIP">
        <TextField value={values.nip} onChange={set("nip")} />
      </Field>
      <Field label="Unit">
        <TextField value={values.unit} onChange={set("unit")} />
      </Field>
      <Field label="No. HP">
        <TextField type="tel" value={values.phone} onChange={set("phone")} />
      </Field>
      <Field label="Dinas">
        <SelectField value={values.departmentId} onChange={set("departmentId")}>
          <option value="">Tidak ada</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </SelectField>
      </Field>

      <div className="grid gap-3 sm:col-span-2">
        {error && <Alert>{error}</Alert>}
        {success && <Alert tone="success">{success}</Alert>}
        <ActionButton type="submit" disabled={isBusy} className="sm:w-fit">
          {isBusy ? "Menyimpan..." : "Buat Akun"}
        </ActionButton>
      </div>
    </form>
  );
}
