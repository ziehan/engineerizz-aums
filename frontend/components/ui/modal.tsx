"use client";

import { useEffect, type ReactNode } from "react";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/** Dialog modal dengan latar buram */
export function Modal({ title, onClose, children }: ModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm sm:items-center"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative my-6 w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
        <button
          type="button"
          aria-label="Tutup"
          onClick={onClose}
          className="absolute right-5 top-4 cursor-pointer text-3xl font-bold leading-none text-red-600 hover:text-red-800"
        >
          ×
        </button>
        <h2 className="mb-4 text-center text-2xl font-bold text-neutral-1000 md:text-3xl">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}
