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

function describeCameraError(err: unknown) {
  const name = (err as { name?: string })?.name;
  if (name === "NotAllowedError") return "Izin kamera ditolak. Aktifkan izin kamera di pengaturan browser.";
  if (name === "NotFoundError") return "Kamera tidak ditemukan di perangkat ini.";
  if (name === "NotReadableError") return "Kamera sedang dipakai aplikasi lain.";
  return "Tidak dapat mengakses kamera.";
}

export function ImageDropzone({ file, onChange, disabled }: ImageDropzoneProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [isStarting, setIsStarting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  useEffect(() => {
    if (!cameraOpen) return;

    let cancelled = false;
    let stream: MediaStream | null = null;

    const start = async () => {
      setCameraError(null);
      setIsStarting(true);
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => {});
        }
      } catch (err) {
        if (!cancelled) setCameraError(describeCameraError(err));
      } finally {
        if (!cancelled) setIsStarting(false);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCameraOpen(false);
    };

    start();
    window.addEventListener("keydown", onKeyDown);

    return () => {
      cancelled = true;
      window.removeEventListener("keydown", onKeyDown);
      stream?.getTracks().forEach((t) => t.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [cameraOpen, facingMode]);

  const accept = (candidate?: File) => {
    if (!candidate) return;
    if (!ACCEPTED.includes(candidate.type)) return setError("Format harus JPEG, PNG, atau WebP.");
    if (candidate.size > MAX_BYTES) return setError("Ukuran foto maksimal 10 MB.");
    setError("");
    onChange(candidate);
  };

  const openCamera = () => {
    if (disabled) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      cameraInput.current?.click();
      return;
    }
    setCameraOpen(true);
  };

  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setCameraError("Gagal mengambil foto, coba lagi.");
          return;
        }
        accept(new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" }));
        setCameraOpen(false);
      },
      "image/jpeg",
      0.85,
    );
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
          onClick={openCamera}
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
        onChange={(e) => {
          accept(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          accept(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {cameraOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Ambil foto dengan kamera"
          className="fixed inset-0 z-[2000] flex flex-col bg-black"
        >
          <div className="relative flex flex-1 items-center justify-center overflow-hidden">
            <video ref={videoRef} playsInline muted autoPlay className="h-full w-full object-contain" />

            {isStarting && !cameraError && (
              <p className="absolute text-sm text-white/80">Menyalakan kamera...</p>
            )}
            {cameraError && (
              <p className="absolute max-w-sm px-6 text-center text-sm text-white">{cameraError}</p>
            )}
          </div>

          <div className="flex items-center justify-between gap-4 bg-black/90 px-6 py-5">
            <button
              type="button"
              onClick={() => setCameraOpen(false)}
              className="cursor-pointer rounded-xl px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
            >
              Batal
            </button>

            <button
              type="button"
              onClick={capture}
              disabled={isStarting || Boolean(cameraError)}
              aria-label="Jepret foto"
              className="h-16 w-16 cursor-pointer rounded-full border-4 border-white bg-white/90 transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            />

            <button
              type="button"
              onClick={() => setFacingMode((m) => (m === "environment" ? "user" : "environment"))}
              className="cursor-pointer rounded-xl px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
            >
              Ganti kamera
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
