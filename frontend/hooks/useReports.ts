"use client";

import { useState, useEffect } from "react";
import { ReportFilters } from "@/lib/types";

export default function useReports(token: string | null, filters: ReportFilters = {}) {
  const [reports, setReports] = useState<any[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
        return;
    }

    const fetchReports = async () => {
      setIsLoadingReports(true);
      setError(null);

      try {
        const baseUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL 
          ? `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/v1` 
          : "http://localhost:5000/api/v1";

        const params = new URLSearchParams();
        if (filters.status) {
            params.append("status", filters.status);
        }

        if (filters.category) {
            params.append("category", filters.category);
        }

        if (filters.priority) {
            params.append("priority", filters.priority);
        }

        if (filters.page) {
            params.append("page", filters.page.toString());
        }

        if (filters.limit) {
            params.append("limit", filters.limit.toString());
        }

        const queryString = params.toString();
        const url = `${baseUrl}/reports/me${queryString ? `?${queryString}` : ""}`;
        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "Gagal mengambil daftar laporan.");
        }

        setReports(result.data || []);
      } catch (err: any) {
        setError(err.message || "Terjadi kesalahan sistem.");
      } finally {
        setIsLoadingReports(false);
      }
    };

    fetchReports();
  }, [
    token,
    filters.status,
    filters.category,
    filters.priority,
    filters.page,
    filters.limit,
  ]);

  return { reports, isLoadingReports, error };
}