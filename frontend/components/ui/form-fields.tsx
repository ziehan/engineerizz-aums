import * as React from "react";
import { cn } from "@/lib/utils";

const FIELD =
  "w-full rounded-lg border border-neutral-300 bg-neutral-200 px-3 py-2 text-sm text-neutral-1000 transition-colors placeholder:text-neutral-600 focus:border-neutral-1000 focus:bg-neutral-100 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50";

interface FieldWrapperProps {
  label?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}

export function Field({ label, hint, className, children }: FieldWrapperProps) {
  return (
    <label className={cn("flex min-w-0 flex-col gap-1", className)}>
      {label && <span className="text-xs font-semibold text-neutral-900">{label}</span>}
      {children}
      {hint && <span className="text-[11px] text-neutral-700">{hint}</span>}
    </label>
  );
}

export const TextField = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn(FIELD, className)} {...props} />
));
TextField.displayName = "TextField";

export const TextArea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(FIELD, "resize-y", className)} {...props} />
));
TextArea.displayName = "TextArea";

export const SelectField = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => (
  <select ref={ref} className={cn(FIELD, "cursor-pointer", className)} {...props} />
));
SelectField.displayName = "SelectField";
