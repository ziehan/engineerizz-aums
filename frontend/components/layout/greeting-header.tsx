"use client";

import useClock from "@/hooks/useClock";
import {
  formatClock,
  formatLongDate,
  getGreeting,
  getIndonesianZone,
} from "@/lib/format";

interface GreetingHeaderProps {
  name: string;
  description: string;
}

/** Sapaan sesuai waktu, jam digital realtime, dan tanggal lengkap. */
export function GreetingHeader({ name, description }: GreetingHeaderProps) {
  const now = useClock();

  return (
    <section>
      <h1 className="text-2xl font-bold leading-tight text-neutral-1000 sm:text-3xl md:text-4xl">
        Selamat {now ? getGreeting(now) : ""}, {name}
      </h1>
      <p className="mt-3 max-w-3xl text-xs text-neutral-800 md:text-sm">{description}</p>

      <div className="mt-6 min-h-12" aria-live="off">
        {now && (
          <>
            <p className="text-xl font-bold text-blue-1000 md:text-2xl">
              {formatClock(now)} {getIndonesianZone(now)}
            </p>
            <p className="text-xs text-neutral-800 md:text-sm">{formatLongDate(now)}</p>
          </>
        )}
      </div>
    </section>
  );
}
