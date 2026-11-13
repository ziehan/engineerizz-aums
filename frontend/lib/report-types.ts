/** Tipe data laporan sesuai Backend AUMS. */

export type ReportStatus =
  | "Pending"
  | "PENDING_AI"
  | "Approved"
  | "In_Progress"
  | "Resolved"
  | "Rejected";

export type Priority = "Low" | "Medium" | "High";

export interface ActionPlan {
  id?: string;
  reportId?: string;
  targetAgency: string;
  estimatedDays: number;
  actionSteps: string[];
  confidenceScore?: number | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  createdAt?: string;
}

export interface AuditLog {
  id: string;
  action: string;
  details: string;
  agentName?: string | null;
  payload?: Record<string, unknown> | null;
  response?: Record<string, unknown> | null;
  confidenceScore?: number | null;
  timestamp: string;
}

export interface Report {
  id: string;
  title: string;
  description: string;
  category: string;
  status: ReportStatus;
  priority: Priority;
  locationAddress?: string;
  latitude: number;
  longitude: number;
  photoUrl?: string | null;
  officerPhotoUrl?: string | null;
  officerNotes?: string | null;
  assignedOfficerName?: string | null;
  resolvedAt?: string | null;
  isDuplicate?: boolean;
  duplicateCount?: number;
  aiProcessed?: boolean;
  requiresHumanReview?: boolean;
  reporterId?: string | null;
  createdAt: string;
  actionPlan?: ActionPlan | null;
  auditLogs?: AuditLog[];
  duplicates?: Report[];
  reporter?: { name?: string; email?: string } | null;
}

export interface ReportFilters {
  status?: string;
  category?: string;
  priority?: string;
}

export interface Department {
  id: string;
  name: string;
  description?: string;
}

export interface HealthStatus {
  status: "ok" | "degraded";
  service: string;
  uptime: number;
  database: "up" | "down";
}
