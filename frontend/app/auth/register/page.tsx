"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Input } from "@/components/input";
import { InputPassword } from "@/components/input-password";
import { ButtonBlue } from "@/components/buttons/button-blue";

export default function RegisterPage() {
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    nama_lengkap: "",
    email: "",
    password: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    try {
      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || "http://localhost:5000";
      
      const response = await fetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.nama_lengkap, 
          email: formData.email,
          password: formData.password,
          role: "CITIZEN", 
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.errors && result.errors.length > 0) {
          throw new Error(result.errors[0].message);
        }
        throw new Error(result.message || "Pendaftaran gagal. Silakan coba lagi.");
      }

      router.push("/auth/login");
      
    } catch (error: any) {
      setErrorMessage(error.message || "Terjadi kesalahan pada server.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative h-screen w-full overflow-hidden bg-red-100">
      <div className="absolute inset-0 z-0 flex h-full w-full flex-col overflow-hidden md:flex-row">
        <div className="relative h-[40vh] w-full md:h-full md:w-1/2">
          <Image
            src="/ilustrasi.png"
            alt="logo ilustrasi"
            fill
            priority
            unoptimized
            className="object-cover object-center"
          />
        </div>

        <div className="relative hidden h-full w-1/2 md:block">
          <Image
            src="/ilustrasi.png"
            alt="logo kanan"
            fill
            priority
            unoptimized
            className="object-cover object-center"
          />
        </div>
      </div>

      <div className="relative z-10 flex h-screen w-full flex-col md:flex-row md:justify-start">
        <div className="mt-[35vh] flex h-[65vh] w-full flex-col items-center justify-start overflow-y-auto rounded-t-[46px] bg-white px-6 py-8 shadow-[0_-10px_30px_rgba(0,0,0,0.1)] md:mt-0 md:h-screen md:w-1/2 md:justify-center md:rounded-none md:rounded-r-[46px] md:bg-neutral-100 md:p-12 md:shadow-none lg:px-24">
          <div className="flex w-full max-w-md flex-col gap-y-6 md:gap-y-12">
            <div className="flex w-full flex-col max-md:items-center">
              <h2 className="font-bold text-neutral-1000">Buat Akun</h2>

              <h5 className="mt-1 font-semibold max-md:hidden text-neutral-400 md:mt-2">
                Sudah memiliki akun?{" "}
                <Link href="/auth/login" className="text-blue-400 hover:text-blue-500">
                  Masuk
                </Link>
              </h5>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3 md:gap-6">
              <Input
                label="Nama Lengkap"
                name="nama_lengkap"
                type="text"
                value={formData.nama_lengkap}
                onChange={handleChange}
                required
                disabled={isLoading}
              />

              <Input
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={isLoading}
              />

              <InputPassword
                label="Password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={isLoading}
              />

              {errorMessage && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-500 border border-red-200">
                  {errorMessage}
                </div>
              )}

              <ButtonBlue type="submit" className="mt-4 w-full md:mt-10" disabled={isLoading}>
                {isLoading ? "Memproses..." : "Daftar"}
              </ButtonBlue>
            </form>

            <div className="flex justify-center items-center">
              <h5 className="mt-1 font-semibold md:hidden text-neutral-400 md:mt-2">
                Sudah memiliki akun?{" "}
                <Link href="/auth/login" className="text-blue-400 hover:text-blue-500">
                  Masuk
                </Link>
              </h5>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}