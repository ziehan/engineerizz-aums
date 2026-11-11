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