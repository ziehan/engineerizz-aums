import { apiRequest } from "./client";
import type { Report, ReportFilters } from "@/lib/report-types";

const BASE = "/api/v1/reports";

/** GET /reports: daftar laporan dengan filter opsional. */
export async function fetchReports(filters: ReportFilters = {}): Promise<Report[]> {
  const res = await apiRequest<{ data: Report[] }>(BASE, {
    query: { ...filters },
  });
  return res.data ?? [];
}

/** GET /reports/:id: detail laporan */
export async function fetchReport(id: string): Promise<Report> {
  const res = await apiRequest<{ data: Report }>(`${BASE}/${id}`);
  return res.data;
}

export interface PlanInput {
  targetAgency?: string;
  estimatedDays?: number;
  actionSteps?: string[];
}

/** POST /reports/plan/:id : menyimpan atau menyusun action plan laporan. */
export async function requestPlan(id: string, body: PlanInput = {}) {
  return apiRequest(`${BASE}/plan/${id}`, { method: "POST", body });
}

/** POST /reports/:id/verify : mengirim bukti perbaikan (foto + GPS). */
export async function verifyReport(id: string, form: FormData) {
  return apiRequest<{
    data: Report;
    verification?: { isResolved?: boolean; visualMatch?: boolean; auditNotes?: string };
  }>(`${BASE}/${id}/verify`, { method: "POST", body: form });
}

/** PATCH /reports/:id/approve : khusus admin. */
export async function approveReport(id: string, approvedBy: string) {
  return apiRequest(`${BASE}/${id}/approve`, {
    method: "PATCH",
    body: { approvedBy },
  });
}

/** DELETE /reports/:id : khusus admin. */
export async function deleteReport(id: string) {
  return apiRequest(`${BASE}/${id}`, { method: "DELETE" });
}

/** DELETE /reports/duplicates/:duplicateId : khusus admin. */
export async function deleteDuplicate(duplicateId: string) {
  return apiRequest(`${BASE}/duplicates/${duplicateId}`, { method: "DELETE" });
}
