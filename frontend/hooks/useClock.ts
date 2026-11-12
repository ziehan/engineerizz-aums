"use client";

import { useEffect, useState } from "react";

/**
 * Jam yang berdetak tiap detik.
 */
export default function useClock(): Date | null {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return now;
}
