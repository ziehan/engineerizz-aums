"use client";

import type { ReactNode } from "react";
import { Loading } from "@/components/loading";
import { Navbar, type NavLink } from "@/components/layout/navbar";
import { SessionProvider } from "@/hooks/useCurrentUser";
import useRoleGuard from "@/hooks/useRoleGuard";

interface RoleLayoutProps {
  allowedRoles: string[];
  links: NavLink[];
  homeHref: string;
  children: ReactNode;
}

/**
 * Kerangka halaman untuk satu role: validasi sesi, navbar, dan konteks user.
 * Dipakai oleh `app/officer/layout.tsx` dan `app/admin/layout.tsx`.
 */
export function RoleLayout({
  allowedRoles,
  links,
  homeHref,
  children,
}: RoleLayoutProps) {
  const { user, token, isLoading, isAllowed } = useRoleGuard(allowedRoles);

  if (isLoading || !user || !isAllowed) {
    return <Loading text="Memuat sesi..." />;
  }

  return (
    <SessionProvider value={{ user, token }}>
      <div className="min-h-screen bg-neutral-100 text-neutral-1000">
        <Navbar links={links} user={user} homeHref={homeHref} />
        <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-10">
          {children}
        </main>
      </div>
    </SessionProvider>
  );
}
