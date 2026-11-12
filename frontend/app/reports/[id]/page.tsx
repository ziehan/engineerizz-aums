import { Suspense } from "react";
import { Report } from "@/lib/types";

interface IdProps {
    params: Promise<{ id: string }>
}

export default async function ReportPage({ params }: IdProps) {
    const paramsBenar = await params;
    const id = paramsBenar.id;

    return (
        <div className="w-full min-h-screen bg-white">=
            <h1 className="text-neutral-1000">
                Ini id: {id}
            </h1>
        </div>
    )
}

export async function generateStaticParams({ params }: IdProps) {
    const paramsBenar = await params;
    const id = paramsBenar.id;
    const baseUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || "http://localhost:5000";

    const response = await fetch(`${baseUrl}/api/v1/reports/${id}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        }
    });

    const result = await response.json();

    if (response.ok) {
        return result.data;
    }
}