"use client";

import { useState, useEffect, use } from "react";
import Image from "next/image";
import useSession from "@/hooks/useSession";
import { Loading } from "@/components/loading";
import dynamic from "next/dynamic";
import { Navbar, type NavLink } from "@/components/layout/navbar";
import { SessionState } from "@/lib/types";

const NAV_LINKS: NavLink[] = [
    { label: "Home", href: "/", matchPrefix: "/" },
];

const ReportMap = dynamic(() => import("./ReportMap"), {
    ssr: false,
    loading: () => <div className="h-full w-full animate-pulse bg-neutral-200" />,
});

interface ClientProps {
    id: string;
}

export default function ReportDetailClient({ id }: ClientProps) {
    const { user, token, isLoading: isSessionLoading } = useSession();
    const [report, setReport] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (isSessionLoading) return;

        const fetchReport = async () => {
            const baseUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || "http://localhost:5000";
            try {
                const response = await fetch(`${baseUrl}/api/v1/reports/${id}`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        ...(token ? { Authorization: `Bearer ${token}` } : {})
                    },
                });

                const result = await response.json();

                if (response.ok && result) {
                    const reportData = result.data?.report || result.data || result;
                    setReport(reportData);
                } else {
                    setReport(null);
                }
            } catch (error) {
                console.error("Gagal mengambil detail aduan:", error);
                setReport(null);
            } finally {
                setIsLoading(false);
            }
        };

        fetchReport();
    }, [id, token, isSessionLoading]);

    if (isSessionLoading || isLoading) {
        return <Loading text="Memuat detail laporan..." />;
    }

    if (!report) {
        return (
            <div className="w-full min-h-screen bg-neutral-100 flex items-center justify-center">
                <p className="text-neutral-500 font-medium text-lg">Data laporan tidak ditemukan.</p>
            </div>
        );
    }

    const lat = Number(report.latitude);
    const lng = Number(report.longitude);
    const hasCoords =
        report.latitude != null && report.longitude != null &&
        Number.isFinite(lat) && Number.isFinite(lng);

    const formattedDate = report.createdAt
        ? new Date(report.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
        : "[ Tanggal tidak tersedia ]";

    return (
        <>
            {user && <Navbar links={NAV_LINKS} user={user} homeHref="/dashboard" />}
            <div className="w-full min-h-screen bg-neutral-100 p-6 md:p-12 flex justify-center">
                <div className="w-full max-w-5xl flex flex-col gap-6">

                    <div className="flex flex-col">
                        <h2 className="font-bold text-neutral-1000 mb-1">
                            {report.title}
                        </h2>

                        <p className="text-[20px] max-md:text-[12px] text-neutral-900 font-semibold mb-3">
                            {formattedDate}
                        </p>

                        <p className="text-[20px] max-md:text-[12px] text-neutral-800 leading-relaxed text-sm">
                            {report.description}
                        </p>
                    </div>

                    <div className="mt-4">
                        <h3 className="font-bold text-neutral-900 mb-2">Lokasi</h3>
                        {report.locationAddress && (
                            <p className="text-[20px] max-md:text-[12px] text-neutral-600 mb-4">{report.locationAddress}</p>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                        <div className="relative w-full h-[320px] rounded-xl overflow-hidden border border-neutral-300 shadow-sm bg-neutral-200">
                            {hasCoords ? (
                                <>
                                    <ReportMap latitude={lat} longitude={lng} label={report.title} />
                                    <a
                                        href={`https://www.google.com/maps?q=${lat},${lng}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="absolute bottom-3 left-3 z-[1000] bg-black/70 text-white text-xs px-3 py-1.5 rounded-md"
                                    >
                                        Buka di Google Maps
                                    </a>
                                </>
                            ) : (
                                <div className="h-full flex items-center justify-center text-sm text-neutral-500">
                                    Koordinat lokasi tidak tersedia.
                                </div>
                            )}
                        </div>

                        <div className="bg-white rounded-xl border border-neutral-300 p-6 shadow-sm flex flex-col min-h-[320px]">
                            <h3 className="font-bold text-neutral-1000 mb-6">
                                Rencana Tindakan
                            </h3>

                            {report.actionPlan ? (
                                <>
                                    <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
                                        <span className="text-sm font-bold text-neutral-800">
                                            [ {report.actionPlan.targetAgency || "Instansi"} ]
                                        </span>
                                        <span className="text-sm font-semibold text-neutral-600">
                                            Estimasi: {report.actionPlan.estimatedDays || "XX"} Hari
                                        </span>
                                    </div>

                                    <div className="text-neutral-700 text-sm flex-1 mb-6">
                                        {report.actionPlan.actionSteps && report.actionPlan.actionSteps.length > 0 ? (
                                            <ul className="list-disc pl-5 space-y-2">
                                                {report.actionPlan.actionSteps.map((step: string, index: number) => (
                                                    <li key={index}>{step}</li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p>Menunggu rincian langkah pengerjaan.</p>
                                        )}
                                    </div>

                                    <div className="mt-auto pt-4 border-t border-neutral-100">
                                        <span className="text-sm font-semibold text-neutral-500">
                                            [ Assignee: Menunggu Petugas Lapangan ]
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <div className="flex-1 flex items-center justify-center text-neutral-400 text-sm font-medium">
                                    Rencana Tindakan belum diterbitkan.
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </>
    );
}