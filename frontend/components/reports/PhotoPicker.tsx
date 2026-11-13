"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface PhotoPickerProps {
  previewUrl: string | null;
  onSelect: (file: File) => void;
  onClear: () => void;
  disabled?: boolean;
  className?: string;
}

function describeCameraError(err: unknown) {
  const name = (err as { name?: string })?.name;
  if (name === "NotAllowedError") return "Izin kamera ditolak. Aktifkan izin kamera di pengaturan browser.";
  if (name === "NotFoundError") return "Kamera tidak ditemukan di perangkat ini.";
  if (name === "NotReadableError") return "Kamera sedang dipakai aplikasi lain.";
  return "Tidak dapat mengakses kamera.";
}

const BTN = "flex-1 rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-900 transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60";

export function PhotoPicker({ previewUrl, onSelect, onClear, disabled, className }: PhotoPickerProps) {
  const galleryRef = useRef<HTMLInputElement>(null);
  const nativeCameraRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [isStarting, setIsStarting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

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

  const openCamera = () => {
    // getUserMedia hanya ada di HTTPS atau localhost.
    // Di luar itu, pakai kamera bawaan perangkat lewat <input capture>.
    if (!navigator.mediaDevices?.getUserMedia) {
      nativeCameraRef.current?.click();
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
        onSelect(new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" }));
        setCameraOpen(false);
      },
      "image/jpeg",
      0.85,
    );
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    e.target.value = ""; // supaya file yang sama bisa dipilih ulang
    if (selected) onSelect(selected);
  };

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="relative flex h-40 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-neutral-300 bg-white shadow-sm">
        {previewUrl ? (
          <>
            <Image src={previewUrl} alt="Pratinjau foto aduan" fill className="object-contain" />
            <button
              type="button"
              onClick={onClear}
              disabled={disabled}
              aria-label="Hapus foto"
              className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black"
            >
              ✕
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 text-neutral-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs font-medium">Belum ada foto</span>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button type="button" disabled={disabled} onClick={() => galleryRef.current?.click()} className={BTN}>
          Pilih dari galeri
        </button>
        <button type="button" disabled={disabled} onClick={openCamera} className={BTN}>
          Ambil foto
        </button>
      </div>

      <input ref={galleryRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleInput} className="hidden" />
      <input ref={nativeCameraRef} type="file" accept="image/*" capture="environment" onChange={handleInput} className="hidden" />

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
              className="rounded-xl px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
            >
              Batal
            </button>

            <button
              type="button"
              onClick={capture}
              disabled={isStarting || Boolean(cameraError)}
              aria-label="Jepret foto"
              className="h-16 w-16 rounded-full border-4 border-white bg-white/90 transition-transform active:scale-95 disabled:opacity-40"
            />

            <button
              type="button"
              onClick={() => setFacingMode((m) => (m === "environment" ? "user" : "environment"))}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
            >
              Ganti kamera
            </button>
          </div>
        </div>
      )}
    </div>
  );
}