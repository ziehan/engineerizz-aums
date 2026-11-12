"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { User } from "@/lib/types";
import { UserMenu } from "./user-menu";

export interface NavLink {
  label: string;
  activeLabel?: string;
  href: string;
  matchPrefix?: string;
}

interface NavbarProps {
  links: NavLink[];
  user: User;
  homeHref: string;
}

/**
 Navbar responsif
 */
export function Navbar({ links, user, homeHref }: NavbarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (link: NavLink) =>
    pathname === link.href || pathname.startsWith(link.matchPrefix ?? `${link.href}/`);

  const linkClass = (active: boolean) =>
    cn(
      "text-sm font-semibold transition-colors",
      active ? "text-blue-600" : "text-neutral-1000 hover:text-blue-600",
    );

  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white shadow-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 md:px-8">
        <Link href={homeHref} className="flex items-center gap-3">
          <Image
            src="/logo-fix.svg"
            alt="Logo AUMS"
            width={36}
            height={36}
            className="h-9 w-9 shrink-0 object-contain"
          />
          <span className="text-sm font-bold tracking-wide text-neutral-1000">AUMS</span>
        </Link>

        <nav className="hidden items-center gap-10 md:flex" aria-label="Navigasi utama">
          {links.map((link) => {
            const active = isActive(link);
            return (
              <Link key={link.href} href={link.href} className={linkClass(active)}>
                {active && link.activeLabel ? link.activeLabel : link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <UserMenu user={user} />
          <button
            type="button"
            aria-label="Buka menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="flex h-9 w-9 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg hover:bg-neutral-200 md:hidden"
          >
            <span className={cn("h-0.5 w-5 bg-neutral-1000 transition", open && "translate-y-1.5 rotate-45")} />
            <span className={cn("h-0.5 w-5 bg-neutral-1000 transition", open && "opacity-0")} />
            <span className={cn("h-0.5 w-5 bg-neutral-1000 transition", open && "-translate-y-1.5 -rotate-45")} />
          </button>
        </div>
      </div>

      {open && (
        <nav className="flex flex-col gap-1 border-t border-neutral-200 bg-white px-4 py-3 md:hidden">
          {links.map((link) => {
            const active = isActive(link);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={cn("rounded-lg px-3 py-2", linkClass(active), active && "bg-blue-100")}
              >
                {active && link.activeLabel ? link.activeLabel : link.label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
