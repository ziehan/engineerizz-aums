"use client";

import React, { useState } from "react";
import { Input } from "@/components/input"; 
import { InputPassword } from "@/components/input-password"; 
import { ButtonNeutral } from "@/components/buttons/button-neutral"; // 1. Mengimpor ButtonNeutral

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "", 
  });

  const [submittedData, setSubmittedData] = useState<typeof formData | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); 
    console.log("Data berhasil disimpan:", formData);
    setSubmittedData(formData); 
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="mb-6 text-2xl font-bold text-neutral-1000">Pendaftaran</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Input Username */}
          <Input
            label="Username"
            name="username"
            type="text"
            value={formData.username}
            onChange={handleChange}
            required
          />

          {/* Input Email */}
          <Input
            label="Email Address"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
          />

          {/* Input Password */}
          <InputPassword
            label="Password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
          />

          {/* 2. Menggunakan ButtonNeutral untuk Tombol Submit */}
          <ButtonNeutral type="submit" className="mt-2 w-full">
            Simpan Data
          </ButtonNeutral>
        </form>

        {/* Menampilkan hasil data yang tersimpan */}
        {submittedData && (
          <div className="mt-8 rounded-xl bg-neutral-100 p-4 border border-neutral-200">
            <h2 className="mb-2 font-semibold text-neutral-1000">Data Tersimpan:</h2>
            <pre className="text-sm text-neutral-600 overflow-auto">
              {JSON.stringify(submittedData, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}