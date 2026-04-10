import { Card, CardContent, CardHeader, CardTitle } from "./card";

export function StatCard({
  title,
  value,
  hint,
  icon: Icon,
  trend,
  trendValue
}: {
  title: string;
  value: string;
  hint?: string;
  icon?: React.ComponentType<{ className?: string }>;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
}): JSX.Element {
  const trendColors = {
    up: "text-emerald-600 dark:text-emerald-400",
    down: "text-red-600 dark:text-red-400",
    neutral: "text-slate-600 dark:text-slate-400"
  };

  return (
    <Card className="group medical-card-hover relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-sky-50/60 via-cyan-50/40 to-teal-50/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:from-sky-950/30 dark:via-cyan-950/20 dark:to-teal-950/20" />
      <CardHeader className="relative pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
            {title}
          </CardTitle>
          {Icon && (
            <div className="rounded-xl bg-gradient-to-br from-sky-500/15 to-teal-500/15 p-2.5 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-md dark:from-sky-500/25 dark:to-teal-500/25">
              <Icon className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="relative">
        <div className="flex items-baseline justify-between">
          <div className="bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 bg-clip-text text-3xl font-extrabold text-transparent transition-all duration-300 group-hover:scale-105 dark:from-slate-100 dark:via-slate-200 dark:to-slate-100">
            {value}
          </div>
          {trend && trendValue && (
            <div className={`flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-bold ${trendColors[trend]}`}>
              <span className="text-sm">{trend === "up" ? "↑" : trend === "down" ? "↓" : "→"}</span>
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        {hint ? (
          <p className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-400">{hint}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
