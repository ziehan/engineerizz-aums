import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonNeutralProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

const ButtonNeutral = React.forwardRef<HTMLButtonElement, ButtonNeutralProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center px-6 py-3 transition-colors duration-200 border-2 border-neutral-1000",
          "rounded-[11px]", 
          "bg-neutral-100 text-neutral-900", 
          
          "hover:bg-neutral-400 hover:text-neutral-900",
          
          "active:bg-neutral-200 active:text-neutral-900",
    
          "disabled:bg-neutral-200 disabled:border-neutral-600 disabled:text-neutral-500 disabled:cursor-not-allowed",
          
          "font-bold",
          className
        )}
        {...props}
      >
        <h4 className="m-0 p-0 text-inherit font-inherit">
          {children}
        </h4>
      </button>
    );
  }
);

ButtonNeutral.displayName = "ButtonNeutral";

export { ButtonNeutral };