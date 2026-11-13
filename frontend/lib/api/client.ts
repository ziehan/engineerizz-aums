export const BACKEND_URL = (
  process.env.NEXT_PUBLIC_BACKEND_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | undefined>;
  auth?: boolean;
}

/** Mengambil pesan error paling informatif dari body response backend. */
interface ErrorPayload {
  message?: string;
  errors?: { message: string }[];
}

function extractMessage(
  payload: ErrorPayload | null,
  fallback: string,
): string {
  if (payload?.errors?.length) return payload.errors[0].message;
  return payload?.message || fallback;
}

function clearSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

export async function apiRequest<T = unknown>(
  path: string,
  { method = "GET", body, query, auth = true }: RequestOptions = {},
): Promise<T> {
  const url = new URL(`${BACKEND_URL}${path}`);
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });

  const headers: Record<string, string> = {};
  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;
  if (body && !isFormData) headers["Content-Type"] = "application/json";

  if (auth) {
    const token = localStorage.getItem("token");
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body
        ? isFormData
          ? (body as FormData)
          : JSON.stringify(body)
        : undefined,
    });
  } catch {
    throw new ApiError(
      "Tidak dapat terhubung ke server. Periksa koneksi Anda.",
      0,
    );
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401 && auth) {
      clearSession();
      window.location.href = "/auth/login";
    }
    throw new ApiError(
      extractMessage(payload, "Terjadi kesalahan pada server."),
      response.status,
    );
  }

  return payload as T;
}
