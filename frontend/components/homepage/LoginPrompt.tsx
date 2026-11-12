import Link from "next/link";
import { cn } from "@/lib/utils";

interface LoginPromptProps {
  className?: string;
}

export function LoginPrompt({ className }: LoginPromptProps) {
  return (
    <section
      className={cn(
        "flex w-full flex-col items-center gap-4 rounded-2xl border border-neutral-300 bg-white p-8 text-center shadow-sm md:p-12",
        className,
      )}
    >
      <h3 className="font-bold text-neutral-1000">Masuk untuk mengajukan aduan</h3>
      <p className="max-w-xl text-sm text-neutral-600 md:text-base">
        Silakan masuk atau daftar terlebih dahulu untuk mengajukan aduan dan melihat
        peta serta daftar aduan masyarakat. Identitas pelapor dirahasiakan dan hanya
        dapat diakses oleh petugas yang berwenang.
      </p>

      <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        <Link
          href="/auth/login"
          className="inline-flex items-center justify-center rounded-[11px] bg-blue-600 px-6 pt-3 pb-2 font-bold text-neutral-100 transition-colors hover:bg-blue-800 active:bg-blue-900"
        >
          Masuk
        </Link>
        <Link
          href="/auth/register"
          className="inline-flex items-center justify-center rounded-[11px] border border-neutral-1000 px-6 pt-3 pb-2 font-bold text-neutral-1000 transition-colors hover:bg-neutral-100"
        >
          Daftar
        </Link>
      </div>
    </section>
  );
}