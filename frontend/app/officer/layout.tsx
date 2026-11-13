import type { ReactNode } from "react";
import { RoleLayout } from "@/components/layout/role-layout";

const LINKS = [
  { label: "Dashboard", href: "/officer/dashboard" },
  {
    label: "Tugas Saya",
    href: "/officer/tasks",
    matchPrefix: "/officer/reports",
  },
];

export default function OfficerLayout({ children }: { children: ReactNode }) {
  return (
    <RoleLayout
      allowedRoles={["FIELD_OFFICER"]}
      links={LINKS}
      homeHref="/officer/dashboard"
    >
      {children}
    </RoleLayout>
  );
}
