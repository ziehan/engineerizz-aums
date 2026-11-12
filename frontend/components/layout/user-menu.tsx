"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/api/auth";
import type { User } from "@/lib/types";

export function UserMenu({ user }: { user: User }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.replace("/auth/login");
  };

  return (
    <div ref={ref} className="relative min-w-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex max-w-28 min-w-0 cursor-pointer items-center gap-1.5 text-xs font-bold text-neutral-1000 sm:max-w-64 sm:gap-3 md:gap-4 md:text-sm"
      >
        <span className="truncate">{user.name}</span>
        <Image
          src="/navbar-dropdown.svg"
          alt=""
          width={20}
          height={20}
          aria-hidden
          className={`h-4 w-4 shrink-0 transition-transform md:h-5 md:w-5 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-56 max-w-[calc(100vw-1.5rem)] rounded-xl border border-neutral-200 bg-white p-3 shadow-lg">
          <p className="truncate text-sm font-semibold text-neutral-1000">{user.name}</p>
          <p className="truncate text-xs text-neutral-700">{user.email}</p>
          <p className="mt-1 text-[11px] font-semibold uppercase text-blue-700">
            {user.role.replace("_", " ")}
            {user.department?.name ? ` · ${user.department.name}` : ""}
          </p>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-3 w-full cursor-pointer rounded-lg bg-red-100 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-200"
          >
            Keluar
          </button>
        </div>
      )}
    </div>
  );
}
