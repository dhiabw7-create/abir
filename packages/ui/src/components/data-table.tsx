import * as React from "react";
import { cn } from "../lib/utils";

export interface DataTableColumn<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  loading = false,
  empty,
  onRowClick
}: {
  columns: DataTableColumn<T>[];
  data: T[];
  loading?: boolean;
  empty?: React.ReactNode;
  onRowClick?: (row: T) => void;
}): JSX.Element {
  if (loading) {
    return (
      <div className="surface-card space-y-2 p-4">
        {Array.from({ length: 5 }).map((_, idx) => (
          <div
            key={idx}
            className="h-10 animate-pulse rounded-lg bg-slate-100/80 dark:bg-slate-800/80"
          />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="surface-card p-5">
        {empty ?? <p className="text-sm text-slate-500 dark:text-slate-400">No data.</p>}
      </div>
    );
  }

  return (
    <div className="medical-card overflow-hidden professional-shadow">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200/60 dark:divide-slate-800/60">
          <thead className="bg-gradient-to-r from-sky-50/80 via-cyan-50/60 to-emerald-50/80 dark:from-slate-900/95 dark:via-slate-800/80 dark:to-slate-900/95">
            <tr>
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className="px-5 py-4 text-left text-xs font-bold uppercase tracking-[0.1em] text-slate-600 dark:text-slate-300"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/80 dark:divide-slate-800/60 bg-white/50 dark:bg-slate-900/30">
            {data.map((row, idx) => (
              <tr
                key={row.id}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  "transition-all duration-200",
                  idx % 2 === 0
                    ? "bg-white/70 dark:bg-slate-900/40"
                    : "bg-slate-50/50 dark:bg-slate-900/50",
                  onRowClick
                    ? "cursor-pointer hover:bg-gradient-to-r hover:from-sky-50/90 hover:to-cyan-50/70 hover:shadow-sm dark:hover:from-slate-800/80 dark:hover:to-slate-800/60"
                    : ""
                )}
              >
                {columns.map((col) => (
                  <td
                    key={String(col.key)}
                    className={cn(
                      "whitespace-nowrap px-5 py-4 text-sm font-medium text-slate-700 dark:text-slate-200",
                      col.className
                    )}
                  >
                    {col.render ? col.render(row) : String((row as Record<string, unknown>)[String(col.key)] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
