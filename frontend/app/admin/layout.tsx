import type { ReactNode } from "react";
import { RoleLayout } from "@/components/layout/role-layout";

const LINKS = [
  { label: "Dashboard", href: "/admin/dashboard" },
  { label: "Laporan", href: "/admin/reports" },
  { label: "Pengguna", href: "/admin/users" },
];

/** Kerangka seluruh halaman admin */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <RoleLayout
      allowedRoles={["ADMIN", "CRM_OFFICER"]}
      links={LINKS}
      homeHref="/admin/dashboard"
    >
      {children}
    </RoleLayout>
  );
}
