import Image from "next/image";

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

/** Navigasi halaman */
export function Pagination({ page, totalPages, onChange }: PaginationProps) {
  const arrow =
    "flex h-7 w-7 cursor-pointer items-center justify-center rounded transition-opacity hover:opacity-75 disabled:cursor-not-allowed disabled:opacity-40";
  const box =
    "inline-flex min-w-7 items-center justify-center rounded-[5px] border border-neutral-400 bg-white px-2 py-0.5 text-xs text-neutral-500";

  return (
    <nav
      aria-label="Navigasi halaman"
      className="flex items-center justify-center gap-2.5 py-4 text-xs text-neutral-500"
    >
      <button
        type="button"
        aria-label="Halaman sebelumnya"
        className={arrow}
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        <Image
          src="/previous-page.svg"
          alt=""
          width={7}
          height={13}
          aria-hidden
          className="h-[13px] w-[7px]"
        />
      </button>

      <span className={box}>{page}</span>
      <span>dari</span>
      <span className={box}>{totalPages}</span>

      <button
        type="button"
        aria-label="Halaman berikutnya"
        className={arrow}
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        <Image
          src="/next-page.svg"
          alt=""
          width={7}
          height={13}
          aria-hidden
          className="h-[13px] w-[7px]"
        />
      </button>
    </nav>
  );
}
