import * as React from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "../lib/utils";

export interface AppShellItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function AppShell({
  items,
  topbar,
  children,
  footer
}: {
  items: AppShellItem[];
  topbar: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}): JSX.Element {
  const location = useLocation();

  return (
    <div className="relative min-h-screen text-slate-900 dark:text-slate-100">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-sky-200/[0.35] via-transparent to-transparent dark:from-sky-900/25" />
        <div className="absolute -left-28 top-36 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl dark:bg-cyan-500/[0.12]" />
        <div className="absolute -right-10 top-12 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl dark:bg-emerald-500/10" />
      </div>
      <div className="mx-auto flex min-h-screen w-full max-w-[1720px]">
        <aside className="sticky top-4 m-4 hidden h-[calc(100vh-2rem)] w-72 shrink-0 flex-col rounded-3xl border border-slate-200/80 bg-white/[0.82] p-4 shadow-[0_24px_50px_-30px_rgba(15,23,42,0.45)] backdrop-blur-md lg:flex dark:border-slate-800/90 dark:bg-slate-950/75">
          <div className="mb-6 flex items-center gap-3 px-2 fade-in">
            <div className="relative grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-sky-500 via-cyan-500 to-teal-500 text-sm font-bold text-white shadow-lg shadow-sky-500/40 transition-all duration-300 hover:scale-105 hover:rotate-3 active:scale-95">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent" />
              <span className="relative z-10">MF</span>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent dark:from-slate-100 dark:to-slate-300">
                MedFlow
              </h1>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Clinic Intelligence Platform
              </p>
            </div>
          </div>

          <nav className="flex-1 space-y-1.5 overflow-y-auto pr-1">
            {items.map((item) => {
              const Icon = item.icon;
              const active = location.pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    active
                      ? "border-sky-200/80 bg-gradient-to-r from-sky-50/95 via-cyan-50/80 to-emerald-50/70 text-sky-800 shadow-md shadow-sky-200/50 dark:border-sky-800/70 dark:from-sky-950/60 dark:via-cyan-950/40 dark:to-emerald-950/30 dark:text-sky-200 dark:shadow-sky-900/30"
                      : "border-transparent text-slate-600 hover:border-slate-200/60 hover:bg-white/80 hover:text-slate-900 hover:shadow-sm dark:text-slate-300 dark:hover:border-slate-700/60 dark:hover:bg-slate-900/80 dark:hover:text-slate-100"
                  )}
                >
                  {active && (
                    <div className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-sky-500 to-teal-500 shadow-sm" />
                  )}
                  <span
                    className={cn(
                      "relative grid h-8 w-8 place-items-center rounded-lg transition-all duration-200",
                      active
                        ? "bg-gradient-to-br from-sky-500 to-teal-500 text-white shadow-md shadow-sky-500/30"
                        : "bg-slate-100 text-slate-500 transition-all duration-200 group-hover:bg-slate-200 group-hover:text-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:group-hover:bg-slate-700 dark:group-hover:text-slate-200"
                    )}
                  >
                    <Icon className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
                  </span>
                  <span className="truncate font-medium">{item.label}</span>
                  {active && (
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-sky-500/5 to-teal-500/5 animate-pulse" />
                  )}
                </Link>
              );
            })}
          </nav>

          {footer ? <div className="mt-4 rounded-2xl bg-slate-50/[0.85] p-3 dark:bg-slate-900/70">{footer}</div> : null}
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-2 z-30 mx-3 mt-3 rounded-2xl glass-surface px-4 py-3 sm:px-5 lg:mx-6 lg:mt-4 lg:px-6">
            {topbar}
            <div className="mt-3 overflow-x-auto pb-1 lg:hidden">
              <div className="flex min-w-max gap-2 pr-2">
                {items.map((item) => {
                  const Icon = item.icon;
                  const active = location.pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                        active
                          ? "border-sky-200 bg-sky-100 text-sky-700 dark:border-sky-800 dark:bg-sky-900/[0.45] dark:text-sky-200"
                          : "border-slate-200 bg-white/70 text-slate-600 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </header>

          <main className="flex-1 px-3 py-6 sm:px-4 lg:px-8 lg:py-8">
            <div className="mx-auto w-full max-w-[1320px]">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
