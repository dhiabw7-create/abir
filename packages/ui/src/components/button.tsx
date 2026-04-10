import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/80 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 dark:focus-visible:ring-offset-slate-950",
  {
    variants: {
      variant: {
        default:
          "relative overflow-hidden bg-gradient-to-r from-sky-600 via-cyan-600 to-teal-600 text-white shadow-[0_14px_32px_-18px_rgba(14,165,233,0.85)] hover:shadow-[0_18px_40px_-18px_rgba(14,165,233,0.95)] hover:scale-[1.02] hover:brightness-110 before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/0 before:via-white/20 before:to-white/0 before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-700",
        secondary:
          "border border-slate-200 bg-white/[0.85] text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 hover:shadow-md hover:scale-[1.02] dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:hover:bg-slate-800/90 dark:hover:border-slate-600",
        outline:
          "border border-slate-300 bg-transparent text-slate-700 hover:bg-slate-100/80 hover:border-slate-400 hover:shadow-sm hover:scale-[1.02] dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800/70 dark:hover:border-slate-600",
        destructive:
          "relative overflow-hidden bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-[0_14px_30px_-18px_rgba(220,38,38,0.8)] hover:shadow-[0_18px_40px_-18px_rgba(220,38,38,0.9)] hover:scale-[1.02] hover:brightness-110 before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/0 before:via-white/20 before:to-white/0 before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-700"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-11 px-6 text-base",
        icon: "h-10 w-10"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
