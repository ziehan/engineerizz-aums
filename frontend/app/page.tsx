"use client";

import React, { useState } from "react";
import { Input } from "@/components/input"; 
import { InputPassword } from "@/components/input-password"; 
import { ButtonNeutral } from "@/components/buttons/button-neutral"; // 1. Mengimpor ButtonNeutral

export default function LandingPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="mb-6 text-2xl font-bold text-neutral-1000">Ini Landing Page, ke /auth/login buat login</h1>
      </div>
    </div>
  );
}