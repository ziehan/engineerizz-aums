import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonBlueProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

const ButtonBlue = React.forwardRef<HTMLButtonElement, ButtonBlueProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center px-6 py-3 transition-colors duration-200",
          "rounded-[11px]", 
          "bg-blue-600 text-neutral-100", 
          
          "hover:bg-blue-800 hover:text-neutral-100",
          
          "active:bg-blue-900 active:text-neutral-400",
    
          "disabled:bg-blue-300 disabled:text-neutral-100 disabled:cursor-not-allowed",
          
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

ButtonBlue.displayName = "ButtonBlue";

export { ButtonBlue };