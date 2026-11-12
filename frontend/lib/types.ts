export interface UserDepartment {
    id?: string;
    name?: string;
}

export interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    departmentId?: string;
    nip?: string;
    unit?: string;
    phone?: string;
    nik?: string;
    isAvailable?: boolean;
    department?: UserDepartment | null;
    createdAt?: string;
    updatedAt?: string;
}

export interface SessionState {
  user: User | null;
  isLoading: boolean;
  token: string | null;
}

export interface ReportFilters {
  status?: string;
  category?: string;
  priority?: string;
  page?: number;
  limit?: number;
}

export type Greeting = "pagi" | "siang" | "sore" | "malam";

export interface Report {
    id: string;
    title: string;
    description: string;
    category: string;
    status: string;
    priority: string;
    locationAddress: string;
    latitude: string;
    longitude: string;
    photoUrl: string;
    officerPhotoUrl: string | null;
    officerNotes: string | null;
    assignedOfficerName: string | null;
    targetAgency: string;
    resolvedAt: Date | null;
    isDuplicate: boolean;
    duplicateCount: number;
    createdAt: Date;
    updatedAt: Date;
}