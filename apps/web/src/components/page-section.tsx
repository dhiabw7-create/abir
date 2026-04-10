import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@medflow/ui";

export function PageSection({
  title,
  description,
  children,
  action
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}): JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="surface-card-interactive group">
        <CardHeader className="flex flex-col items-start justify-between gap-4 border-b border-slate-200/60 sm:flex-row dark:border-slate-800/60">
          <div>
            <CardTitle className="text-xl font-bold gradient-text-medical">{title}</CardTitle>
            {description ? (
              <p className="mt-2.5 text-sm font-medium text-slate-600 dark:text-slate-400">{description}</p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </CardHeader>
        <CardContent className="pt-6">{children}</CardContent>
      </Card>
    </motion.div>
  );
}
