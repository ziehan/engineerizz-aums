import React from "react";
import { cn } from "@/lib/utils";

export interface LoadingProps {
  className?: string;
  text?: string; 
}

export function Loading({ className, text = "Memuat..." }: LoadingProps) {
  return (
    <div 
      className={cn(
        "flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-neutral-50", 
        className
      )}
    >
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-neutral-200 border-t-blue-600"></div>
      {text && <p className="text-sm font-semibold text-neutral-500">{text}</p>}
    </div>
  );
}