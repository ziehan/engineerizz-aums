"use client";

import { SessionState } from "@/lib/types";
import useSession from "@/hooks/useSession";
import { Loading } from "@/components/loading"; 

export default function DashboardPage() {
    const { user, isLoading }: SessionState = useSession();

    if (isLoading) {
        return <Loading text="Loading data user..." />;
    }

    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-neutral-100">
            <h1 className="text-3xl font-bold text-neutral-1000">
                HALO, ini {user?.name}
            </h1>
        </div>
    );
}