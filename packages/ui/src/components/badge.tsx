import * as React from "react";
import { cn } from "../lib/utils";

export function Badge({
  variant = "default",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  variant?: "default" | "success" | "warning" | "error" | "info" | "medical";
}): JSX.Element {
  const variants = {
    default: "border-sky-200 bg-sky-50/90 text-sky-700 dark:border-sky-800/80 dark:bg-sky-900/[0.35] dark:text-sky-300",
    success: "border-emerald-200 bg-emerald-50/90 text-emerald-700 dark:border-emerald-800/80 dark:bg-emerald-900/[0.35] dark:text-emerald-300",
    warning: "border-amber-200 bg-amber-50/90 text-amber-700 dark:border-amber-800/80 dark:bg-amber-900/[0.35] dark:text-amber-300",
    error: "border-red-200 bg-red-50/90 text-red-700 dark:border-red-800/80 dark:bg-red-900/[0.35] dark:text-red-300",
    info: "border-blue-200 bg-blue-50/90 text-blue-700 dark:border-blue-800/80 dark:bg-blue-900/[0.35] dark:text-blue-300",
    medical: "border-cyan-200 bg-gradient-to-r from-cyan-50/90 to-teal-50/90 text-cyan-700 dark:border-cyan-800/80 dark:from-cyan-900/[0.35] dark:to-teal-900/[0.35] dark:text-cyan-300"
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.05em] shadow-sm transition-all duration-200",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
