import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, placeholder, ...props }, ref) => {
    return (
      <div className="relative w-full mt-2">
        <input
          type={type}
          ref={ref}
          placeholder={placeholder || " "}
          className={cn(
            // Ukuran font: 10px di mobile, 20px di desktop
            // Tinggi form: h-12 di mobile, h-14.5 di desktop
            "peer flex w-full h-12 md:h-14.5 rounded-xl border-2 border-transparent bg-neutral-200 px-4 py-2 text-[10px] md:text-[20px] text-neutral-1000 transition-all duration-200",
            "focus:border-neutral-1000 focus:bg-neutral-100 focus:outline-none focus:ring-0",
            "not-placeholder-shown:border-neutral-1000 not-placeholder-shown:bg-neutral-100",
            "file:bg-transparent file:text-sm file:font-medium disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          {...props}
        />
        {label && (
          <label
            className={cn(
              "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 px-2 transition-all duration-200",
              
              "font-semibold text-neutral-400 bg-transparent text-[12px] md:text-[20px]",
            
              "peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:bg-neutral-100 peer-focus:text-[10px] md:peer-focus:text-[16px] peer-focus:text-neutral-1000",
              
              "peer-not-placeholder-shown:top-0 peer-not-placeholder-shown:-translate-y-1/2 peer-not-placeholder-shown:bg-neutral-100 peer-not-placeholder-shown:text-[10px] md:peer-not-placeholder-shown:text-[16px] peer-not-placeholder-shown:text-neutral-1000"
            )}
          >
            {label}
          </label>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";

export { Input };