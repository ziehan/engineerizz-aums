/* eslint-disable @next/next/no-img-element */
import type { Report } from "@/lib/report-types";

function Photo({ src, label }: { src?: string | null; label: string }) {
  return (
    <figure className="overflow-hidden rounded-2xl bg-neutral-300 shadow-md">
      {src ? (
        <img src={src} alt={label} className="h-56 w-full object-cover md:h-60" />
      ) : (
        <div className="flex h-40 items-center justify-center text-sm text-neutral-700">
          Foto tidak tersedia
        </div>
      )}
      <figcaption className="bg-white px-3 py-1.5 text-xs font-semibold text-neutral-800">
        {label}
      </figcaption>
    </figure>
  );
}

/** Foto laporan warga, ditambah foto bukti perbaikan bila sudah ada. */
export function ReportPhotos({ report }: { report: Report }) {
  return (
    <div className="grid gap-4">
      <Photo src={report.photoUrl} label="Foto laporan (sebelum)" />
      {report.officerPhotoUrl && (
        <Photo src={report.officerPhotoUrl} label="Bukti perbaikan (sesudah)" />
      )}
    </div>
  );
}
