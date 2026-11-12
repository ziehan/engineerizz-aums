import { Suspense } from "react";
import ReportDetailClient from "./ReportDetailClient";
import { Loading } from "@/components/loading";

interface IdProps {
    params: Promise<{ id: string }>;
}

async function ReportContent({ params }: IdProps) {
    const { id } = await params;
    return <ReportDetailClient id={id} />;
}

export default function ReportPage({ params }: IdProps) {
    return (
        <Suspense fallback={<Loading text="Memuat halaman..." />}>
            <ReportContent params={params} />
        </Suspense>
    );
}