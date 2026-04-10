import { cn } from "../lib/utils";

export function Skeleton({ className, shimmer = true }: { className?: string; shimmer?: boolean }): JSX.Element {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800",
        shimmer && "animate-pulse",
        className
      )}
    >
      {shimmer && (
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/10" />
      )}
    </div>
  );
}
