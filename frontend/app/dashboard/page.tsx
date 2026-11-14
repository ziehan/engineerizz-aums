"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Greeting } from "@/lib/types";
import useRoleGuard from "@/hooks/useRoleGuard";
import useReports from "@/hooks/useReports";
import { Loading } from "@/components/loading";
import { getGreetings } from "@/lib/getGreetings";
import { formatDate } from "@/lib/formatDate";
import { ButtonBlue } from "@/components/buttons/button-blue";
import { ButtonRed } from "@/components/buttons/button-red";
import { cn } from "@/lib/utils";
import { Navbar, type NavLink } from "@/components/layout/navbar";

const NAV_LINKS: NavLink[] = [
  { label: "Lacak Aduan", href: "/", matchPrefix: "/" },
];

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading, token, isAllowed } = useRoleGuard(["CITIZEN"]);
  const [greeting, setGreeting] = useState<Greeting | null>(null);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    priority: "",
    status: "",
    category: "",
  });

  const [availableCategories, setAvailableCategories] = useState<string[]>([]);

  const [expandedCards, setExpandedCards] = useState<string[]>([]);

  const { reports, isLoadingReports, error } = useReports(
    isAllowed ? token : null,
    filters,
  );

  useEffect(() => {
    setGreeting(getGreetings());

    const id = setInterval(() => setGreeting(getGreetings()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (reports && reports.length > 0) {
      setAvailableCategories((prevCategories) => {
        const currentCategories = reports
          .map((report) => report.category)
          .filter(Boolean);
        const uniqueCategories = Array.from(
          new Set([...prevCategories, ...currentCategories]),
        );
        return uniqueCategories.sort();
      });
    }
  }, [reports]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
      page: 1,
    }));
    setExpandedCards([]);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1) return;
    setFilters((prev) => ({
      ...prev,
      page: newPage,
    }));
    setExpandedCards([]);
  };

  const toggleCard = (id: string) => {
    setExpandedCards((prev) =>
      prev.includes(id)
        ? prev.filter((cardId) => cardId !== id)
        : [...prev, id],
    );
  };

  if (isLoading || !user || !isAllowed) {
    return <Loading text="Memuat data pengguna..." />;
  }

  if (!greeting) {
    return null;
  }

  return (
    <>
      {user && <Navbar links={NAV_LINKS} user={user} homeHref="/dashboard" />}
      <div className="flex min-h-screen w-full flex-col bg-neutral-100 p-6 md:p-22.5 gap-y-5 md:gap-y-15">
        <div className="mb-6 w-full max-w-4xl text-left">
          <h2 className="text-3xl font-bold text-neutral-1000">
            Selamat {greeting}, {user?.name}
          </h2>
        </div>

        <div className="relative flex w-full flex-col gap-y-5">
          <h3 className="text-neutral-1000 font-bold">
            Aduan yang pernah dibuat
          </h3>

          <div className="mb-6 flex w-full flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex w-full max-w-4xl md:flex-row flex-col gap-4">
              <select
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                className="w-full appearance-none rounded-xl border border-neutral-300 bg-neutral-100 pl-5 pr-10 py-2.5 text-[10px] md:text-[15px] text-neutral-1000 outline-none focus:border-blue-500 md:w-auto bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23303030%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-no-repeat bg-position-[right_12px_center] bg-size-[16px_16px] cursor-pointer"
              >
                <option value="">Semua Status</option>
                <option value="Pending">Pending</option>
                <option value="PENDING_AI">Menunggu AI</option>
                <option value="Approved">Disetujui</option>
                <option value="In_Progress">Sedang Ditangani</option>
                <option value="Resolved">Selesai</option>
                <option value="Rejected">Ditolak</option>
              </select>

              <select
                name="category"
                value={filters.category}
                onChange={handleFilterChange}
                className="w-full appearance-none rounded-xl border border-neutral-300 bg-neutral-100 pl-5 pr-10 py-2.5 text-[10px] md:text-[15px] text-neutral-1000 outline-none focus:border-blue-500 md:w-auto bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23303030%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-no-repeat bg-position-[right_12px_center] bg-size-[16px_16px] cursor-pointer"
              >
                <option value="">Semua Kategori</option>
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              <select
                name="priority"
                value={filters.priority}
                onChange={handleFilterChange}
                className="w-full appearance-none rounded-xl border border-neutral-300 bg-neutral-100 pl-5 pr-10 py-2.5 text-[10px] md:text-[15px] text-neutral-1000 outline-none focus:border-blue-500 md:w-auto bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23303030%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-no-repeat bg-position-[right_12px_center] bg-size-[16px_16px] cursor-pointer"
              >
                <option value="">Semua Prioritas</option>
                <option value="High">Tinggi (High)</option>
                <option value="Medium">Sedang (Medium)</option>
                <option value="Low">Rendah (Low)</option>
              </select>
            </div>

            <button
              className={cn(
                "inline-flex items-center justify-center px-6 py-3 transition-colors duration-200",
                "rounded-[11px]",
                "bg-red-600 text-neutral-100",

                "hover:bg-red-800 hover:text-neutral-100",

                "active:bg-red-900 active:text-neutral-400",

                "disabled:bg-red-300 disabled:text-neutral-100 disabled:cursor-not-allowed",

                "font-bold",
                "max-md:hidden",
              )}
              onClick={() => {
                router.push("/reports/create");
              }}
            >
              <h6 className="m-0 p-0 text-inherit font-inherit">
                Ajukan Laporan
              </h6>
            </button>
          </div>

          <button
            className={cn(
              "inline-flex items-center justify-center px-6 py-3 transition-colors duration-200",
              "rounded-[11px]",
              "bg-red-600 text-neutral-100",

              "hover:bg-red-800 hover:text-neutral-100",

              "active:bg-red-900 active:text-neutral-400",

              "disabled:bg-red-300 disabled:text-neutral-100 disabled:cursor-not-allowed",

              "font-bold",
              "md:hidden",
            )}
            onClick={() => {
              router.push("/reports/create");
            }}
          >
            <h6 className="m-0 p-0 text-inherit font-inherit">
              Ajukan Laporan
            </h6>
          </button>

          <div className="w-full rounded-2xl">
            {isLoadingReports ? (
              <Loading
                text="Memuat laporan..."
                className="min-h-50 bg-transparent"
              />
            ) : error ? (
              <div className="rounded-lg bg-red-50 p-4 text-red-500 border border-red-200">
                {error}
              </div>
            ) : reports.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <p className="text-neutral-500 font-medium max-md:text-[10px]">
                  Belum ada laporan yang ditemukan.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {reports.map((report) => {
                  const isExpanded = expandedCards.includes(report.id);
                  return (
                    <div
                      key={report.id}
                      className="flex flex-col gap-3 w-full rounded-xl border border-neutral-800 p-4 hover:bg-neutral-50 transition-colors overflow-hidden"
                    >
                      <div
                        className="flex items-start justify-between cursor-pointer"
                        onClick={() => toggleCard(report.id)}
                      >
                        <h4 className="font-bold text-neutral-1000 text-lg">
                          {report.title}
                        </h4>

                        <button className="text-neutral-500 shrink-0 ml-4 mt-1 transition-transform duration-200 focus:outline-none">
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
                            className={`w-5 h-5 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
                          >
                            <polyline points="6 9 12 15 18 9"></polyline>
                          </svg>
                        </button>
                      </div>

                      {isExpanded && report.photoUrl && (
                        <div className="relative h-48 w-full max-w-[320px] shrink-0 overflow-hidden rounded-lg bg-neutral-200 mt-2">
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
                        <h6 className="text-neutral-600 mt-1">
                          {formatDate(report.createdAt)}
                        </h6>
                        <h6 className="text-neutral-800 mt-2 line-clamp-2">
                          {report.description}
                        </h6>

                        <div className="flex flex-wrap items-center justify-between gap-4 mt-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`px-3 pt-1.5 pb-0.5 text-[12px] font-semibold rounded-md 
                                                                ${
                                                                  report.priority ===
                                                                  "High"
                                                                    ? "bg-priority-high text-neutral-100"
                                                                    : report.priority ===
                                                                        "Medium"
                                                                      ? "bg-priority-medium text-neutral-1000"
                                                                      : report.priority ===
                                                                          "Low"
                                                                        ? "bg-priority-low text-neutral-1000"
                                                                        : "bg-black text-white"
                                                                }
                                                            `}
                            >
                              {report.priority}
                            </span>
                            <span
                              className={`px-3 pt-1.5 pb-0.5 text-[12px] font-semibold rounded-md 
                                                                ${
                                                                  report.status ===
                                                                  "Declined"
                                                                    ? "bg-priority-high text-neutral-100"
                                                                    : report.status ===
                                                                        "Pending"
                                                                      ? "bg-priority-medium text-neutral-1000"
                                                                      : report.status ===
                                                                          "Approved"
                                                                        ? "bg-blue-400 text-neutral-100"
                                                                        : report.status ===
                                                                            "Resolved"
                                                                          ? "bg-priority-low text-neutral-1000"
                                                                          : "bg-black text-white"
                                                                }
                                                            `}
                            >
                              {report.status}
                            </span>
                            <span
                              className={`px-3 pt-1.5 border border-neutral-1000 pb-0.5 text-[12px] font-semibold rounded-md text-neutral-1000`}
                            >
                              {report.category}
                            </span>
                          </div>

                          {isExpanded && (
                            <div className="flex">
                              <ButtonBlue
                                onClick={() => {
                                  router.push(`/reports/${report.id}`);
                                }}
                                className="w-full md:w-auto px-6 pt-2 pb-1"
                              >
                                <p className="text-[16px]">Lihat detail</p>
                              </ButtonBlue>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {reports.length > 0 && !isLoadingReports && (
            <div className="w-full flex justify-center items-center">
              <div className="mt-6 flex w-full max-w-4xl items-center justify-between px-2">
                <button
                  onClick={() => handlePageChange(filters.page - 1)}
                  disabled={filters.page === 1}
                  className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-neutral-700 shadow-sm border border-neutral-200 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>&larr;</span> Prev
                </button>

                <span className="text-sm font-semibold text-neutral-600">
                  Halaman {filters.page}
                </span>

                <button
                  onClick={() => handlePageChange(filters.page + 1)}
                  disabled={reports.length < filters.limit}
                  className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-neutral-700 shadow-sm border border-neutral-200 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next <span>&rarr;</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
