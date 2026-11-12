"use client";

import { useEffect, useState } from "react";

let counter = 0;

export function useMapKey() {
  const [mapKey, setMapKey] = useState<number | null>(null);

  useEffect(() => {
    setMapKey(++counter);
    return () => setMapKey(null);
  }, []);

  return mapKey;
}