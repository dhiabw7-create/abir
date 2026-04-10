import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, DataTable, EmptyState, Input, StatCard } from "@medflow/ui";
import { api } from "@/lib/api";
import { PageSection } from "@/components/page-section";

export function ReportsPage(): JSX.Element {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const kpisQuery = useQuery({
    queryKey: ["reports-kpis", from, to],
    queryFn: async () => {
      const response = await api.get("/reports/kpis", {
        params: {
          from: from ? new Date(from).toISOString() : undefined,
          to: to ? new Date(to).toISOString() : undefined
        }
      });
      return response.data as {
        patients: number;
        consultations: number;
        appointments: number;
        prescriptions: number;
        revenue: number;
      };
    }
  });

  const activityQuery = useQuery({
    queryKey: ["reports-activity"],
    queryFn: async () => {
      const response = await api.get("/reports/activity");
      return response.data as any[];
    }
  });

  return (
    <div className="space-y-6">
      <PageSection
        title="KPIs"
        description="Operational and financial report by date range"
        action={
          <div className="flex flex-wrap items-end gap-2">
            <label>
              <span className="mb-1 block text-xs text-slate-500">From</span>
              <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
            </label>
            <label>
              <span className="mb-1 block text-xs text-slate-500">To</span>
              <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
            </label>
            <Button onClick={() => kpisQuery.refetch()}>Apply</Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard title="Patients" value={String(kpisQuery.data?.patients ?? 0)} />
          <StatCard title="Consultations" value={String(kpisQuery.data?.consultations ?? 0)} />
          <StatCard title="Appointments" value={String(kpisQuery.data?.appointments ?? 0)} />
          <StatCard title="Prescriptions" value={String(kpisQuery.data?.prescriptions ?? 0)} />
          <StatCard
            title="Revenue"
            value={`${(kpisQuery.data?.revenue ?? 0).toFixed(3)} TND`}
          />
        </div>
      </PageSection>

      <PageSection title="Audit + Activity Logs" description="Traceable events for compliance and QA">
        <DataTable
          data={activityQuery.data ?? []}
          loading={activityQuery.isLoading}
          columns={[
            {
              key: "createdAt",
              header: "Date",
              render: (row: any) => new Date(row.createdAt).toLocaleString("fr-TN")
            },
            {
              key: "actor",
              header: "User",
              render: (row: any) =>
                row.actor
                  ? `${row.actor.lastName} ${row.actor.firstName}`
                  : "System"
            },
            {
              key: "action",
              header: "Action",
              render: (row: any) => row.action
            },
            {
              key: "entity",
              header: "Entity",
              render: (row: any) => row.entity
            },
            {
              key: "entityId",
              header: "Entity ID",
              render: (row: any) => row.entityId
            }
          ]}
          empty={<EmptyState title="No logs" description="No activity captured yet." />}
        />
      </PageSection>
    </div>
  );
}
