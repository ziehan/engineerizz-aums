"use client";

import { useEffect, useState } from "react";
import HeroPage from "@/components/homepage/HeroPage";
import { LoginPrompt } from "@/components/homepage/LoginPrompt";
import { PublicReportList } from "@/components/homepage/PublicReportList";
import { PublicReportsMap } from "@/components/homepage/PublicReportsMap";
import { Navbar, type NavLink } from "@/components/layout/navbar";
import { Loading } from "@/components/loading";
import type { User } from "@/lib/types";
import useReportList from "@/hooks/useReportList";

const NAV_LINKS: NavLink[] = [
  { label: "Buat Aduan", href: "/reports/create", matchPrefix: "/reports/create" },
  { label: "Dashboard", href: "/dashboard", matchPrefix: "/dashboard" },
];

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || "http://localhost:5000";

type AuthState =
  | { status: "loading" }
  | { status: "guest" }
  | { status: "error"; message: string }
  | { status: "authenticated"; user: User };

export default function LandingPage() {
  const [auth, setAuth] = useState<AuthState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const { reports, isLoading, error } = useReportList();

  useEffect(() => {
    const controller = new AbortController();

    const checkSession = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setAuth({ status: "guest" });
        return;
      }

      try {
        const res = await fetch(`${BASE_URL}/api/v1/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });

        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem("token");
          setAuth({ status: "guest" });
          return;
        }

        if (!res.ok) {
          setAuth({
            status: "error",
            message:
              res.status === 429
                ? "Terlalu banyak permintaan, coba lagi sebentar."
                : `Gagal memeriksa sesi (status ${res.status}).`,
          });
          return;
        }

        const json = await res.json();
        const user = json.data as User | undefined;
        setAuth(user ? { status: "authenticated", user } : { status: "guest" });
      } catch (err: any) {
        if (err.name === "AbortError") return;
        console.warn("Gagal memeriksa sesi:", err);
        setAuth({ status: "error", message: "Tidak dapat menghubungi server." });
      }
    };

    checkSession();
    return () => controller.abort();
  }, [attempt]);

  if (auth.status === "loading") {
    return <Loading text="Memuat halaman..." />;
  }

  if (auth.status === "error") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-neutral-50 p-6 text-center">
        <p className="text-neutral-800">{auth.message}</p>
        <button
          type="button"
          onClick={() => {
            setAuth({ status: "loading" });
            setAttempt((n) => n + 1);
          }}
          className="rounded-[11px] bg-blue-600 px-6 py-3 font-bold text-neutral-100 hover:bg-blue-800"
        >
          Coba lagi
        </button>
      </main>
    );
  }

  const isLoggedIn = auth.status === "authenticated";

  return (
    <>
      {isLoggedIn && <Navbar links={NAV_LINKS} user={auth.user} homeHref="/dashboard" />}

      <main className="flex min-h-screen flex-col gap-8 bg-neutral-50 p-2">
        <HeroPage />

        <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 pb-12 max-md:gap-2 md:px-2">
          {isLoggedIn ? (
            <>
              <PublicReportsMap reports={reports} isLoading={isLoading} error={error} />
              <PublicReportList reports={reports} isLoading={isLoading} error={error} />
            </>
          ) : (
            <LoginPrompt />
          )}
        </div>
      </main>
    </>
  );
}