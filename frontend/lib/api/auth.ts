import { apiRequest } from "./client";

/** POST /auth/logout: mencabut token di server lalu membersihkan sesi lokal. */
export async function logout(): Promise<void> {
  try {
    await apiRequest("/api/auth/logout", { method: "POST" });
  } catch {

  }
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}
