"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loading } from "@/components/loading";
import { ButtonBlue } from "@/components/buttons/button-blue";
import { formatDate } from "@/lib/formatDate";
import { cn } from "@/lib/utils";
import type { ReportsData } from "./types";

const SELECT_CLASS = "w-full appearance-none rounded-xl border border-neutral-300 bg-neutral-100 pl-5 pr-10 py-2.5 text-[10px] md:text-[15px] text-neutral-1000 outline-none focus:border-blue-500 md:w-auto bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23303030%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-no-repeat bg-position-[right_12px_center] bg-size-[16px_16px] cursor-pointer";

const PRIORITY_STYLE: Record<string, string> = {
  High: "bg-priority-high text-neutral-100",
  Medium: "bg-priority-medium text-neutral-1000",
  Low: "bg-priority-low text-neutral-1000",
};

const STATUS_STYLE: Record<string, string> = {
  Pending: "bg-priority-medium text-neutral-1000",
  PENDING_AI: "bg-neutral-300 text-neutral-1000",
  Approved: "bg-blue-400 text-neutral-100",
  In_Progress: "bg-blue-600 text-neutral-100",
  Resolved: "bg-priority-low text-neutral-1000",
  Rejected: "bg-priority-high text-neutral-100",
};

const STATUS_LABEL: Record<string, string> = {
  Pending: "Pending",
  PENDING_AI: "Menunggu AI",
  Approved: "Disetujui",
  In_Progress: "Sedang Ditangani",
  Resolved: "Selesai",
  Rejected: "Ditolak",
};

const BADGE = "rounded-md px-3 pb-0.5 pt-1.5 text-[12px] font-semibold";

interface PublicReportListProps extends ReportsData {
  title?: string;
  pageSize?: number;
  className?: string;
}

export function PublicReportList({
  reports,
  isLoading,
  error,
  title = "Aduan Masyarakat",
  pageSize = 10,
  className,
}: PublicReportListProps) {
  const router = useRouter();

  const [filters, setFilters] = useState({
    page: 1,
    priority: "",
    status: "",
    category: "",
  });
  const [expandedCards, setExpandedCards] = useState<string[]>([]);

  const categories = useMemo(
    () => Array.from(new Set(reports.map((r) => r.category).filter(Boolean))).sort(),
    [reports],
  );

  const filtered = useMemo(
    () =>
      reports.filter(
        (r) =>
          (!filters.status || r.status === filters.status) &&
          (!filters.category || r.category === filters.category) &&
          (!filters.priority || r.priority === filters.priority),
      ),
    [reports, filters.status, filters.category, filters.priority],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(filters.page, totalPages);
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value, page: 1 }));
    setExpandedCards([]);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setFilters((prev) => ({ ...prev, page: newPage }));
    setExpandedCards([]);
  };

  const toggleCard = (id: string) => {
    setExpandedCards((prev) =>
      prev.includes(id) ? prev.filter((cardId) => cardId !== id) : [...prev, id],
    );
  };

  return (
    <section className={cn("flex w-full flex-col gap-y-5", className)}>
      <h3 className="font-bold text-neutral-1000">{title}</h3>

      <div className="flex w-full flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex w-full max-w-4xl flex-col gap-4 md:flex-row">
          <select name="status" value={filters.status} onChange={handleFilterChange} className={SELECT_CLASS}>
            <option value="">Semua Status</option>
            {Object.entries(STATUS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <select name="category" value={filters.category} onChange={handleFilterChange} className={SELECT_CLASS}>
            <option value="">Semua Kategori</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select name="priority" value={filters.priority} onChange={handleFilterChange} className={SELECT_CLASS}>
            <option value="">Semua Prioritas</option>
            <option value="High">Tinggi (High)</option>
            <option value="Medium">Sedang (Medium)</option>
            <option value="Low">Rendah (Low)</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() => router.push("/reports/create")}
          className={cn(
            "inline-flex w-full items-center justify-center px-6 py-3 md:w-auto",
            "rounded-[11px] bg-red-600 font-bold text-neutral-100 transition-colors duration-200",
            "hover:bg-red-800 active:bg-red-900 active:text-neutral-400",
            "disabled:cursor-not-allowed disabled:bg-red-300",
          )}
        >
          <h6 className="m-0 p-0 text-inherit font-inherit">Ajukan Laporan</h6>
        </button>
      </div>

      <div className="w-full rounded-2xl">
        {isLoading ? (
          <Loading text="Memuat laporan..." className="min-h-50 bg-transparent" />
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-500">{error}</div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="font-medium text-neutral-500 max-md:text-[10px]">
              {reports.length === 0
                ? "Belum ada laporan yang ditemukan."
                : "Tidak ada laporan yang cocok dengan filter."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {visible.map((report) => {
              const isExpanded = expandedCards.includes(report.id);
              return (
                <div
                  key={report.id}
                  className="flex w-full flex-col gap-3 overflow-hidden rounded-xl border border-neutral-800 p-4 transition-colors hover:bg-neutral-50"
                >
                  <div
                    className="flex cursor-pointer items-start justify-between"
                    onClick={() => toggleCard(report.id)}
                  >
                    <h4 className="text-lg font-bold text-neutral-1000">{report.title}</h4>

                    <button
                      type="button"
                      aria-label={isExpanded ? "Tutup detail" : "Buka detail"}
                      aria-expanded={isExpanded}
                      className="ml-4 mt-1 shrink-0 text-neutral-500 focus:outline-none"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={cn("h-5 w-5 transition-transform duration-300", isExpanded && "rotate-180")}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                  </div>

                  {isExpanded && report.photoUrl && (
                    <div className="relative mt-2 h-48 w-full max-w-[320px] shrink-0 overflow-hidden rounded-lg bg-neutral-200">
                      <Image
                        src={report.photoUrl}
                        alt={`Foto aduan ${report.title}`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 320px"
                      />
                    </div>
                  )}

                  <div className="flex flex-col">
                    <h6 className="mt-1 text-neutral-600">{formatDate(report.createdAt)}</h6>
                    <h6 className="mt-2 line-clamp-2 text-neutral-800">{report.description}</h6>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn(BADGE, PRIORITY_STYLE[report.priority] ?? "bg-black text-white")}>
                          {report.priority}
                        </span>
                        <span className={cn(BADGE, STATUS_STYLE[report.status] ?? "bg-black text-white")}>
                          {STATUS_LABEL[report.status] ?? report.status}
                        </span>
                        <span className={cn(BADGE, "border border-neutral-1000 text-neutral-1000")}>
                          {report.category}
                        </span>
                      </div>

                      {isExpanded && (
                        <ButtonBlue
                          onClick={() => router.push(`/reports/${report.id}`)}
                          className="w-full px-6 pb-1 pt-2 md:w-auto"
                        >
                          <p className="text-[16px]">Lihat detail</p>
                        </ButtonBlue>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {!isLoading && filtered.length > 0 && (
        <div className="mt-6 flex w-full max-w-4xl items-center justify-between self-center px-2">
          <button
            type="button"
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1}
            className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span>&larr;</span> Prev
          </button>

          <span className="text-sm font-semibold text-neutral-600">
            Halaman {page} dari {totalPages}
          </span>

          <button
            type="button"
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages}
            className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next <span>&rarr;</span>
          </button>
        </div>
      )}
    </section>
  );
}