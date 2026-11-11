import React, { useState } from "react";
import { Input, InputProps } from "./input";
import { cn } from "@/lib/utils";

export const InputPassword = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    const [show, setShow] = useState(false);
    
    return (
      <div className="relative w-full">
        <Input
          ref={ref}
          type={show ? "text" : "password"}
          className={cn("pr-12", className)}
          {...props}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute right-4 top-[calc(50%+4px)] -translate-y-1/2 text-neutral-400 transition-colors hover:text-neutral-1000 focus:outline-none"
          onClick={() => setShow((v) => !v)}
        >
          {show ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9-4-9-7s4-7 9-7c1.13 0 2.21.195 3.225.555M19.07 4.93A9.953 9.953 0 0121 12c0 1.657-.672 3.157-1.757 4.243M15 12a3 3 0 11-6 0 3 3 0 016 0zM3 3l18 18" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          )}
        </button>
      </div>
    );
  }
);
InputPassword.displayName = "InputPassword";