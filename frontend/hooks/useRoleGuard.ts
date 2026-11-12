"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import useSession from "@/hooks/useSession";
import type { SessionState } from "@/lib/types";

const HOME_BY_ROLE: Record<string, string> = {
  ADMIN: "/admin/dashboard",
  FIELD_OFFICER: "/officer/dashboard",
  CITIZEN: "/dashboard",
};

/**
 * Memastikan pengguna sudah login dan memiliki salah satu role yang diizinkan.
 */
export default function useRoleGuard(allowedRoles: string[]) {
  const router = useRouter();
  const session: SessionState = useSession();
  const { user, isLoading } = session;

  const isAllowed = !!user && allowedRoles.includes(user.role);

  useEffect(() => {
    if (isLoading || !user || isAllowed) return;
    router.replace(HOME_BY_ROLE[user.role] ?? "/auth/login");
  }, [isLoading, user, isAllowed, router]);

  return { ...session, isAllowed };
}
