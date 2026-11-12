"use client";

import { useState } from "react";
import { StaffForm } from "@/components/admin/staff-form";
import { PageHeading } from "@/components/layout/page-heading";
import { formatDateTime } from "@/lib/format";
import type { User } from "@/lib/types";

/** /admin/users: menambahkan akun field officer atau admin. */
export default function AdminUsersPage() {
  const [created, setCreated] = useState<User[]>([]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        title="Tambah Pengguna"
        subtitle="Buat akun petugas lapangan atau admin. Akun warga mendaftar sendiri lewat halaman registrasi."
      />

      <StaffForm onCreated={(u) => setCreated((prev) => [u, ...prev])} />

      {created.length > 0 && (
        <section>
          <h2 className="text-lg font-bold">Dibuat pada sesi ini</h2>
          <ul className="mt-2 divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
            {created.map((u) => (
              <li key={u.id} className="flex flex-wrap justify-between gap-2 px-4 py-3 text-sm">
                <span>
                  <strong>{u.name}</strong> · {u.email}
                </span>
                <span className="text-xs text-neutral-700">
                  {u.role} · {formatDateTime(u.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
