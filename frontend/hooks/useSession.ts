"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User, SessionState } from "@/lib/types";

export default function useSession(): SessionState {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true); 

  useEffect(() => {
    const tokenFromLocal = localStorage.getItem("token");
    if (!tokenFromLocal) {
      alert("Belum terautentikasi, silakan login terlebih dahulu.");
      setIsLoading(false);
      router.push("/auth/login");
      return;
    }

    setToken(tokenFromLocal);

    const fetchUser = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || "http://localhost:5000";

        const response = await fetch(`${baseUrl}/api/auth/me`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${tokenFromLocal}`,
            "Content-Type": "application/json"
          }
        });

        const result = await response.json();

        if (!response.ok) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          alert("Sesi Anda telah berakhir, silakan login kembali.");
          router.push("/auth/login");
          return;
        }

        setUser(result.data);
      } catch (error) {
        console.error("Gagal mengambil data user:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [router]); 

  return { user, isLoading, token };
}