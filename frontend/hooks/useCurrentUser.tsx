"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { User } from "@/lib/types";

interface SessionContextValue {
  user: User;
  token: string | null;
}

const SessionContext = createContext<SessionContextValue | null>(null);

/** Membagikan data user yang sudah tervalidasi ke seluruh halaman dalam satu layout. */
export function SessionProvider({
  value,
  children,
}: {
  value: SessionContextValue;
  children: ReactNode;
}) {
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useCurrentUser(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useCurrentUser harus dipakai di dalam SessionProvider.");
  return ctx;
}
