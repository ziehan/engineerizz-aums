import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "blue" | "green" | "red" | "neutral";
type Size = "sm" | "md";

export interface ActionButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const VARIANTS: Record<Variant, string> = {
  blue: "bg-blue-600 text-white hover:bg-blue-800 active:bg-blue-900 disabled:bg-blue-300",
  green:
    "bg-priority-low text-neutral-1000 hover:bg-green-400 active:bg-green-500 disabled:bg-green-200",
  red: "bg-red-600 text-white hover:bg-red-800 active:bg-red-900 disabled:bg-red-300",
  neutral:
    "border-2 border-neutral-1000 bg-neutral-100 text-neutral-1000 hover:bg-neutral-200 disabled:border-neutral-400 disabled:text-neutral-500",
};

const SIZES: Record<Size, string> = {
  sm: "px-4 py-1.5 text-xs md:text-sm",
  md: "px-6 py-2.5 text-sm md:text-base",
};

export const ActionButton = React.forwardRef<HTMLButtonElement, ActionButtonProps>(
  ({ variant = "blue", size = "md", className, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg font-semibold transition-colors duration-200 disabled:cursor-not-allowed",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  ),
);
ActionButton.displayName = "ActionButton";
