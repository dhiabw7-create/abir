import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, DataTable, EmptyState, Input, Modal } from "@medflow/ui";
import { api } from "@/lib/api";
import { PageSection } from "@/components/page-section";
import { toast } from "sonner";

export function CnamBordereauxPage(): JSX.Element {
  const queryClient = useQueryClient();

  const bordereauxQuery = useQuery({
    queryKey: ["cnam-bordereaux"],
    queryFn: async () => {
      const response = await api.get("/cnam/bordereaux");
      return response.data as any[];
    }
  });

  const doctorsQuery = useQuery({
    queryKey: ["cnam-doctors"],
    queryFn: async () => {
      const response = await api.get("/users");
      return (response.data as any[]).filter((user) => user.role.name === "DOCTOR");
    }
  });

  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const response = await api.post("/cnam/bordereaux", payload);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Bordereau created");
      queryClient.invalidateQueries({ queryKey: ["cnam-bordereaux"] });
    },
    onError: () => toast.error("Failed to create bordereau")
  });

  const exportMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/cnam/bordereaux/${id}/export`, {});
      return response.data;
    },
    onSuccess: () => {
      toast.success("TXT export generated");
      queryClient.invalidateQueries({ queryKey: ["cnam-bordereaux"] });
    }
  });

  return (
    <PageSection
      title="Bordereau Builder"
      description="Create and export configurable TXT bordereaux"
      action={
        <Modal
          trigger={<Button>Create Bordereau</Button>}
          title="Create Bordereau"
          description="Select doctor and period"
        >
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              createMutation.mutate({
                doctorId: String(formData.get("doctorId")),
                periodStart: new Date(String(formData.get("periodStart"))).toISOString(),
                periodEnd: new Date(String(formData.get("periodEnd"))).toISOString()
              });
            }}
          >
            <label>
              <span className="mb-1 block text-sm font-medium">Doctor</span>
              <select name="doctorId" className="w-full rounded-xl border border-slate-300 bg-transparent p-2" required>
                <option value="">Select doctor</option>
                {(doctorsQuery.data ?? []).map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.lastName} {doctor.firstName}
                  </option>
                ))}
              </select>
            </label>
            <Input type="date" name="periodStart" required />
            <Input type="date" name="periodEnd" required />
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </form>
        </Modal>
      }
    >
      <DataTable
        data={bordereauxQuery.data ?? []}
        loading={bordereauxQuery.isLoading}
        columns={[
          {
            key: "reference",
            header: "Reference",
            render: (row: any) => row.reference
          },
          {
            key: "doctor",
            header: "Doctor",
            render: (row: any) => `${row.doctor.lastName} ${row.doctor.firstName}`
          },
          {
            key: "status",
            header: "Status",
            render: (row: any) => row.status
          },
          {
            key: "totalAmount",
            header: "Amount",
            render: (row: any) => `${Number(row.totalAmount).toFixed(3)} TND`
          },
          {
            key: "actions",
            header: "Actions",
            render: (row: any) => (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => exportMutation.mutate(row.id)}>
                  Export TXT
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    api.patch(`/cnam/bordereaux/${row.id}/archive`).then(() => {
                      toast.success("Bordereau archived");
                      queryClient.invalidateQueries({ queryKey: ["cnam-bordereaux"] });
                    });
                  }}
                >
                  Archive
                </Button>
              </div>
            )
          }
        ]}
        empty={<EmptyState title="No bordereau" description="Create the first bordereau." />}
      />
    </PageSection>
  );
}
