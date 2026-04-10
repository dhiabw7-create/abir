import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { StatCard, EmptyState, Skeleton } from "@medflow/ui";
import { Users, Calendar, Activity, Stethoscope, Wallet, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import { PageSection } from "@/components/page-section";

interface DashboardSummary {
  patients: number;
  appointmentsToday: number;
  waiting: number;
  consultationsToday: number;
  revenueToday: number;
  noShows: number;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut"
    }
  }
};

export function DashboardPage(): JSX.Element {
  const summaryQuery = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: async () => {
      const response = await api.get<DashboardSummary>("/dashboard/summary");
      return response.data;
    }
  });

  const chartQuery = useQuery({
    queryKey: ["dashboard-chart"],
    queryFn: async () => {
      const response = await api.get<Array<{ date: string; appointments: number; revenue: number }>>(
        "/dashboard/chart"
      );
      return response.data;
    }
  });

  const summary = summaryQuery.data;
  const isLoading = summaryQuery.isLoading;

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-4"
      >
        <h1 className="text-4xl font-extrabold tracking-tight gradient-text-medical">Dashboard</h1>
        <p className="mt-3 text-base font-medium text-slate-600 dark:text-slate-400">
          Real-time overview of your clinic's performance and activity metrics
        </p>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3"
      >
        {isLoading ? (
          <>
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </>
        ) : (
          <>
            <motion.div variants={itemVariants}>
              <StatCard
                title="Patients"
                value={String(summary?.patients ?? 0)}
                hint="Active records"
                icon={Users}
                trend="up"
                trendValue="+12%"
              />
            </motion.div>
            <motion.div variants={itemVariants}>
              <StatCard
                title="Appointments Today"
                value={String(summary?.appointmentsToday ?? 0)}
                hint="Scheduled visits"
                icon={Calendar}
                trend="neutral"
              />
            </motion.div>
            <motion.div variants={itemVariants}>
              <StatCard
                title="Waiting Room"
                value={String(summary?.waiting ?? 0)}
                hint="Live queue"
                icon={Activity}
                trend={summary && summary.waiting > 0 ? "up" : "neutral"}
              />
            </motion.div>
            <motion.div variants={itemVariants}>
              <StatCard
                title="Consultations Today"
                value={String(summary?.consultationsToday ?? 0)}
                hint="Clinical activity"
                icon={Stethoscope}
                trend="up"
                trendValue="+5"
              />
            </motion.div>
            <motion.div variants={itemVariants}>
              <StatCard
                title="Revenue Today"
                value={`${(summary?.revenueToday ?? 0).toFixed(3)} TND`}
                hint="Collected payments"
                icon={Wallet}
                trend="up"
                trendValue="+8%"
              />
            </motion.div>
            <motion.div variants={itemVariants}>
              <StatCard
                title="No-Shows"
                value={String(summary?.noShows ?? 0)}
                hint="Missed appointments"
                icon={AlertCircle}
                trend={summary && summary.noShows > 0 ? "down" : "neutral"}
              />
            </motion.div>
          </>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        <PageSection
          title="Activity Analytics"
          description="Comprehensive view of appointments and revenue trends over the last 30 days"
        >
          {chartQuery.isLoading ? (
            <Skeleton className="h-80 w-full rounded-2xl" />
          ) : chartQuery.data && chartQuery.data.length > 0 ? (
            <div className="h-80 w-full rounded-2xl bg-gradient-to-br from-white/50 to-slate-50/30 p-6 backdrop-blur-sm dark:from-slate-900/50 dark:to-slate-950/30">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartQuery.data}>
                  <defs>
                    <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.7} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.1} />
                    </linearGradient>
                    <linearGradient id="appGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "currentColor" }}
                    strokeOpacity={0.5}
                  />
                  <YAxis
                    yAxisId="appointments"
                    tick={{ fontSize: 11, fill: "currentColor" }}
                    strokeOpacity={0.5}
                  />
                  <YAxis
                    yAxisId="revenue"
                    orientation="right"
                    tick={{ fontSize: 11, fill: "currentColor" }}
                    strokeOpacity={0.5}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.95)",
                      border: "1px solid rgba(148, 163, 184, 0.2)",
                      borderRadius: "12px",
                      boxShadow: "0 10px 30px -10px rgba(15, 23, 42, 0.3)"
                    }}
                  />
                  <Area
                    yAxisId="revenue"
                    type="monotone"
                    dataKey="revenue"
                    stroke="#0ea5e9"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#revGradient)"
                  />
                  <Area
                    yAxisId="appointments"
                    type="monotone"
                    dataKey="appointments"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#appGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState
              title="No analytics yet"
              description="As appointments and payments are created, trends will appear here."
            />
          )}
        </PageSection>
      </motion.div>
    </div>
  );
}
