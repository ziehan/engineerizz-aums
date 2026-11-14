"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import useSession from "@/hooks/useSession";
import type { SessionState } from "@/lib/types";

export const HOME_BY_ROLE: Record<string, string> = {
  ADMIN: "/admin/dashboard",
  CRM_OFFICER: "/admin/dashboard",
  FIELD_OFFICER: "/officer/dashboard",
  CITIZEN: "/dashboard",
};

export function getHomeByRole(role?: string | null): string {
  return (role && HOME_BY_ROLE[role.toUpperCase()]) || "/auth/login";
}

/**
 * Memastikan pengguna sudah login dan memiliki salah satu role yang diizinkan.
 */
export default function useRoleGuard(allowedRoles: string[]) {
  const router = useRouter();
  const session: SessionState = useSession();
  const { user, isLoading } = session;

  const normalizedRole = user?.role?.toUpperCase() ?? "";
  const isAllowed = !!user && allowedRoles.includes(normalizedRole);

  useEffect(() => {
    if (isLoading || !user || isAllowed) return;
    router.replace(getHomeByRole(user.role));
  }, [isLoading, user, isAllowed, router]);

  return { ...session, isAllowed };
}
