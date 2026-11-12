"use client";

import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { cn } from "@/lib/utils";

interface ImageDropzoneProps {
  file: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Area unggah foto: klik, seret-lepas, atau ambil langsung dari kamera.
 */
export function ImageDropzone({ file, onChange, disabled }: ImageDropzoneProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);

  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const accept = (candidate?: File) => {
    if (!candidate) return;
    if (!ACCEPTED.includes(candidate.type)) return setError("Format harus JPEG, PNG, atau WebP.");
    if (candidate.size > MAX_BYTES) return setError("Ukuran foto maksimal 10 MB.");
    setError("");
    onChange(candidate);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (!disabled) accept(e.dataTransfer.files[0]);
  };

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => !disabled && fileInput.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && !disabled && fileInput.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex min-h-44 cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-dashed border-neutral-500 bg-neutral-200 p-3 text-center transition-colors hover:bg-neutral-300",
          dragging && "border-blue-600 bg-blue-100",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        {preview ? (
          <img src={preview} alt="Pratinjau foto" className="max-h-56 rounded-lg object-contain" />
        ) : (
          <>
            <span aria-hidden className="text-3xl">🖼️</span>
            <span className="text-xs text-neutral-800">Tarik atau pilih file di sini</span>
          </>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
        <button
          type="button"
          disabled={disabled}
          onClick={() => cameraInput.current?.click()}
          className="cursor-pointer font-semibold text-blue-700 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
        >
          📷 Gunakan kamera
        </button>
        {file && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(null)}
            className="cursor-pointer font-semibold text-red-700 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
          >
            Hapus foto
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}

      <input
        ref={fileInput}
        type="file"
        accept={ACCEPTED.join(",")}
        className="hidden"
        onChange={(e) => accept(e.target.files?.[0])}
      />
      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => accept(e.target.files?.[0])}
      />
    </div>
  );
}
