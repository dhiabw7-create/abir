import { Inbox } from "lucide-react";

export function EmptyState({
  title,
  description,
  action,
  icon: Icon = Inbox
}: {
  title: string;
  description: string;
  action?: JSX.Element;
  icon?: React.ComponentType<{ className?: string }>;
}): JSX.Element {
  return (
    <div className="medical-card flex min-h-64 flex-col items-center justify-center border-2 border-dashed border-slate-200/60 p-12 text-center dark:border-slate-800/60">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-100/80 via-cyan-100/60 to-emerald-100/80 shadow-sm dark:from-sky-900/50 dark:via-cyan-900/40 dark:to-emerald-900/40">
        <Icon className="h-8 w-8 text-sky-600 dark:text-sky-400" />
      </div>
      <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{title}</h3>
      <p className="mt-3 max-w-md text-sm font-medium text-slate-500 dark:text-slate-400">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
