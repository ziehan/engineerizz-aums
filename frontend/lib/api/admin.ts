import { apiRequest } from "./client";
import type { Department, HealthStatus } from "@/lib/report-types";
import type { User } from "@/lib/types";

export interface CreateStaffPayload {
  name: string;
  email: string;
  password: string;
  role: "FIELD_OFFICER" | "ADMIN";
  nip?: string;
  unit?: string;
  phone?: string;
  departmentId?: string;
}

/** POST /auth/officers: membuat akun petugas / admin. */
export async function createStaff(payload: CreateStaffPayload): Promise<User> {
  const res = await apiRequest<{ data: User }>("/api/auth/officers", {
    method: "POST",
    body: payload,
  });
  return res.data;
}

/** GET /auth/departments: daftar dinas untuk dropdown. */
export async function fetchDepartments(): Promise<Department[]> {
  const res = await apiRequest<{ data: Department[] }>("/api/auth/departments", {
    auth: false,
  });
  return res.data ?? [];
}

/**
 * GET /health: status layanan & database.
*/
export async function fetchHealth(): Promise<HealthStatus> {
  const base = process.env.NEXT_PUBLIC_BACKEND_API_URL || "http://localhost:5000";
  const response = await fetch(`${base}/health`);
  return response.json();
}
