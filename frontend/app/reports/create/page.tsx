"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Input } from "@/components/input";
import { ButtonBlue } from "@/components/buttons/button-blue";
import { getCoordinates } from "@/lib/getCoordinate";
import { ButtonRed } from "@/components/buttons/button-red";
import dynamic from "next/dynamic";
import { Navbar, type NavLink } from "@/components/layout/navbar";
import { SessionState } from "@/lib/types";
import useSession from "@/hooks/useSession";
import { PhotoPicker } from "@/components/reports/PhotoPicker";

const NAV_LINKS: NavLink[] = [{ label: "Home", href: "/", matchPrefix: "/" }];

const BASE_URL = (
  process.env.NEXT_PUBLIC_BACKEND_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

const LocationPicker = dynamic(() => import("./LocationPicker"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-neutral-200" />,
});

export default function CreateReportPage() {
  const router = useRouter();
  const { user, isLoading, token }: SessionState = useSession();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Jalan Rusak");
  const [locationAddress, setLocationAddress] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [isLoadingGPS, setIsLoadingGPS] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    handleFetchLocation();
  }, []);

  const fetchAddress = async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `${BASE_URL}/api/v1/maps/reverse-geocode?lat=${lat}&lng=${lng}`,
      );
      const json = await res.json();
      const address = json.data?.address;
      if (res.ok && address) setLocationAddress(address);
    } catch {}
  };

  const handlePickLocation = (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
    setErrorMessage(null);
    fetchAddress(lat, lng);
  };

  const handleFetchLocation = async () => {
    setIsLoadingGPS(true);
    setErrorMessage(null);
    try {
      const coords = await getCoordinates();
      handlePickLocation(coords.latitude, coords.longitude);
    } catch (err: any) {
      setErrorMessage(
        `${err.message || "Gagal mendeteksi lokasi GPS."} Anda bisa memilih lokasi langsung di peta.`,
      );
    } finally {
      setIsLoadingGPS(false);
    }
  };

  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

  const handleSelectFile = (selectedFile: File) => {
    if (!ALLOWED_TYPES.includes(selectedFile.type)) {
      setErrorMessage(
        "Format citra wajib: image/jpeg, image/png, atau image/webp.",
      );
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      setErrorMessage("Ukuran berkas maksimal 10MB.");
      return;
    }
    setErrorMessage(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
  };

  const handleClearFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !title ||
      !description ||
      !file ||
      latitude === null ||
      longitude === null
    ) {
      setErrorMessage(
        "Mohon lengkapi Judul, Detail, File Foto, dan pastikan GPS aktif.",
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("category", category);
      formData.append("latitude", latitude.toString());
      formData.append("longitude", longitude.toString());
      formData.append("locationAddress", locationAddress);
      formData.append("image", file);

      const token = localStorage.getItem("token");

      const response = await fetch(`${BASE_URL}/api/v1/reports/intake`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Gagal mengirim aduan.");
      }

      router.push("/dashboard");
    } catch (err: any) {
      setErrorMessage(err.message || "Terjadi kesalahan pada server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {user && <Navbar links={NAV_LINKS} user={user} homeHref="/dashboard" />}
      <div className="flex min-h-screen w-full flex-col bg-neutral-100 p-6 md:p-15 items-center">
        <div className="mb-8 w-full max-w-4xl text-center">
          <h2 className="font-bold text-neutral-1000">Ajukan Aduan Baru</h2>
          <p className="text-[20px] text-neutral-800 mt-2">
            Anda tidak perlu khawatir, identitas pelapor dirahasiakan dan hanya
            bisa diakses oleh petugas yang berwenang.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 w-full max-w-4xl rounded-lg bg-red-50 p-4 text-red-600 border border-red-200 text-sm">
            {errorMessage}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8"
        >
          <div className="flex flex-col gap-5">
            <div className="relative border border-neutral-300 rounded-2xl overflow-hidden bg-neutral-200 h-[280px] shadow-sm">
              <LocationPicker
                latitude={latitude}
                longitude={longitude}
                onChange={handlePickLocation}
              />

              <div className="pointer-events-none absolute bottom-3 left-3 z-[1000] bg-black/70 text-white text-xs px-3 py-1.5 rounded-md backdrop-blur-sm">
                {isLoadingGPS
                  ? "Mendeteksi posisi GPS..."
                  : latitude !== null
                    ? `${latitude}, ${longitude}`
                    : "Klik peta untuk memilih lokasi"}
              </div>

              <button
                type="button"
                onClick={handleFetchLocation}
                disabled={isLoadingGPS}
                className="absolute top-3 right-3 z-[1000] bg-white text-neutral-900 text-xs font-semibold px-3 py-1.5 rounded-md shadow disabled:opacity-60"
              >
                Gunakan lokasi saya
              </button>
            </div>

            <div className="text-center text-xs text-neutral-500 font-medium">
              atau
            </div>

            <div className="max-md:-mb-3">
              <Input
                type="text"
                name="locationAddress"
                value={locationAddress}
                onChange={(e: any) => setLocationAddress(e.target.value)}
                label="Alamat Lokasi (Opsional)"
              />
            </div>

            <div className="max-md:hidden flex gap-4 pt-4">
              <ButtonBlue
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 justify-center text-white font-semibold rounded-xl"
              >
                {isSubmitting ? "Mengirim..." : "Kirim"}
              </ButtonBlue>
              <ButtonRed
                type="button"
                onClick={() => router.back()}
                disabled={isSubmitting}
                className="w-full py-4 justify-center text-white font-semibold rounded-xl"
              >
                Batal
              </ButtonRed>
            </div>
          </div>

          <div className="flex flex-col gap-5">
            <div>
              <Input
                type="text"
                value={title}
                onChange={(e: any) => setTitle(e.target.value)}
                label="Judul"
                required
              />
            </div>

            <div>
              <div className="relative w-full mt-2">
                <textarea
                  value={description}
                  onChange={(e: any) => setDescription(e.target.value)}
                  placeholder=" "
                  required
                  rows={6}
                  className="peer flex w-full rounded-xl border-2 border-transparent bg-neutral-200 p-4 text-[10px] md:text-[20px] text-neutral-1000 transition-all duration-200 focus:border-neutral-1000 focus:bg-neutral-100 focus:outline-none focus:ring-0 resize-none not-placeholder-shown:border-neutral-1000 not-placeholder-shown:bg-neutral-100"
                />
                <label className="pointer-events-none absolute left-3 top-4 px-2 transition-all duration-200 font-semibold text-neutral-400 bg-transparent text-[12px] md:text-[20px] peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:bg-neutral-100 peer-focus:text-[10px] md:peer-focus:text-[16px] peer-focus:text-neutral-1000 peer-not-placeholder-shown:top-0 peer-not-placeholder-shown:-translate-y-1/2 peer-not-placeholder-shown:bg-neutral-100 peer-not-placeholder-shown:text-[10px] md:peer-not-placeholder-shown:text-[16px] peer-not-placeholder-shown:text-neutral-1000">
                  Detail
                </label>
              </div>
            </div>

            <PhotoPicker
              previewUrl={previewUrl}
              onSelect={handleSelectFile}
              onClear={handleClearFile}
              disabled={isSubmitting}
            />

            <div className="md:hidden flex gap-4 pt-4">
              <ButtonBlue
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 justify-center text-white font-semibold rounded-xl"
              >
                {isSubmitting ? "Mengirim..." : "Kirim"}
              </ButtonBlue>
              <ButtonRed
                type="button"
                onClick={() => router.back()}
                disabled={isSubmitting}
                className="w-full py-4 justify-center text-white font-semibold rounded-xl"
              >
                Batal
              </ButtonRed>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
