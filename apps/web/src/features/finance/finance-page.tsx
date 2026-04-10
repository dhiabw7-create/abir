import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { Button, DataTable, EmptyState, Input, Modal, StatCard } from "@medflow/ui";
import { api } from "@/lib/api";
import { PageSection } from "@/components/page-section";
import { toast } from "sonner";

const chartColors = ["#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#6366f1"];

export function FinancePage(): JSX.Element {
  const queryClient = useQueryClient();

  const overviewQuery = useQuery({
    queryKey: ["finance-overview"],
    queryFn: async () => {
      const response = await api.get("/finance/overview");
      return response.data as any;
    }
  });

  const paymentsQuery = useQuery({
    queryKey: ["finance-payments"],
    queryFn: async () => {
      const response = await api.get("/finance/payments");
      return response.data as any[];
    }
  });

  const patientsQuery = useQuery({
    queryKey: ["finance-patients"],
    queryFn: async () => {
      const response = await api.get("/patients", { params: { pageSize: 100 } });
      return response.data.items as Array<{ id: string; firstName: string; lastName: string }>;
    }
  });

  const createPayment = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const response = await api.post("/finance/payments", payload);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Payment added");
      queryClient.invalidateQueries({ queryKey: ["finance-overview"] });
      queryClient.invalidateQueries({ queryKey: ["finance-payments"] });
    }
  });

  const diagnosisData = useMemo(
    () =>
      (overviewQuery.data?.topDiagnoses ?? []).map((item: any, index: number) => ({
        name: item.label,
        value: item.count,
        color: chartColors[index % chartColors.length]
      })),
    [overviewQuery.data]
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatCard
          title="Revenue Daily"
          value={`${(overviewQuery.data?.revenue?.daily ?? 0).toFixed(3)} TND`}
        />
        <StatCard
          title="Revenue Monthly"
          value={`${(overviewQuery.data?.revenue?.monthly ?? 0).toFixed(3)} TND`}
        />
        <StatCard
          title="Revenue Yearly"
          value={`${(overviewQuery.data?.revenue?.yearly ?? 0).toFixed(3)} TND`}
        />
      </div>

      <PageSection
        title="Top Diagnoses"
        description="Most frequent diagnoses for selected reporting period"
      >
        {diagnosisData.length > 0 ? (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={diagnosisData} dataKey="value" nameKey="name" outerRadius={100}>
                  {diagnosisData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState title="No diagnosis stats" description="Data appears after consultations." />
        )}
      </PageSection>

      <PageSection
        title="Payments"
        description="Revenue entries with export capabilities"
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                api.post("/finance/export").then((result) => {
                  toast.success(`Export ready: ${result.data.records} records`);
                });
              }}
            >
              Export CSV
            </Button>
            <Modal
              trigger={<Button>Add Payment</Button>}
              title="Record Payment"
              description="Attach payment to patient/consultation"
            >
              <form
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  const formData = new FormData(event.currentTarget);
                  createPayment.mutate({
                    patientId: String(formData.get("patientId")),
                    amount: Number(formData.get("amount")),
                    method: String(formData.get("method")),
                    paidAt: new Date(String(formData.get("paidAt"))).toISOString()
                  });
                }}
              >
                <label>
                  <span className="mb-1 block text-sm font-medium">Patient</span>
                  <select name="patientId" className="w-full rounded-xl border border-slate-300 bg-transparent p-2" required>
                    <option value="">Select patient</option>
                    {(patientsQuery.data ?? []).map((patient) => (
                      <option key={patient.id} value={patient.id}>
                        {patient.lastName} {patient.firstName}
                      </option>
                    ))}
                  </select>
                </label>
                <Input name="amount" type="number" step="0.001" placeholder="Amount" required />
                <select name="method" className="w-full rounded-xl border border-slate-300 bg-transparent p-2" required>
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="TRANSFER">Transfer</option>
                </select>
                <Input name="paidAt" type="datetime-local" required />
                <Button type="submit" disabled={createPayment.isPending}>
                  Save Payment
                </Button>
              </form>
            </Modal>
          </div>
        }
      >
        <DataTable
          data={paymentsQuery.data ?? []}
          loading={paymentsQuery.isLoading}
          columns={[
            {
              key: "patient",
              header: "Patient",
              render: (row: any) => `${row.patient.lastName} ${row.patient.firstName}`
            },
            {
              key: "amount",
              header: "Amount",
              render: (row: any) => `${Number(row.amount).toFixed(3)} TND`
            },
            {
              key: "method",
              header: "Method",
              render: (row: any) => row.method
            },
            {
              key: "paidAt",
              header: "Paid At",
              render: (row: any) => new Date(row.paidAt).toLocaleString("fr-TN")
            }
          ]}
          empty={<EmptyState title="No payments" description="Record first payment." />}
        />
      </PageSection>
    </div>
  );
}
