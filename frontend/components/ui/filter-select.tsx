"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

interface FilterSelectProps {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  className?: string;
}

/** Dropdown filter */
export function FilterSelect({ label, value, options, onChange, className }: FilterSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? label;

  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const choose = (nextValue: string) => {
    onChange(nextValue);
    setOpen(false);
  };

  return (
    <div ref={ref} className={cn("relative min-w-0 sm:w-36", className)}>
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="relative flex w-full cursor-pointer items-center justify-center rounded-[6px] border border-neutral-300 bg-white px-7 py-1.5 text-xs font-semibold text-neutral-1000 transition-colors hover:border-neutral-400 focus:border-blue-600 focus:outline-none"
      >
        <span className="truncate text-center">{selectedLabel}</span>
        <Image
          src="/filter-dropdown.svg"
          alt=""
          width={13}
          height={7}
          aria-hidden
          className={cn(
            "pointer-events-none absolute right-2.5 top-1/2 h-[7px] w-[13px] -translate-y-1/2 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={label}
          className="absolute left-1/2 z-30 mt-1 max-h-60 min-w-full w-max -translate-x-1/2 overflow-y-auto rounded-[6px] border border-neutral-300 bg-white py-1 text-center text-xs shadow-md"
        >
          <li>
            <button
              type="button"
              onClick={() => choose("")}
              className={cn(
                "w-full cursor-pointer px-3 py-1.5 text-center transition-colors hover:bg-blue-100",
                value === "" ? "bg-blue-600 font-semibold text-white hover:bg-blue-700" : "text-neutral-1000",
              )}
            >
              {label}
            </button>
          </li>
          {options.map((o) => {
            const active = o.value === value;
            return (
              <li key={o.value}>
                <button
                  type="button"
                  onClick={() => choose(o.value)}
                  className={cn(
                    "w-full cursor-pointer whitespace-nowrap px-3 py-1.5 text-center transition-colors hover:bg-blue-100",
                    active ? "bg-blue-600 font-semibold text-white hover:bg-blue-700" : "text-neutral-1000",
                  )}
                >
                  {o.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
