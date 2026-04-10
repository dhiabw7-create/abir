import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, DataTable, EmptyState, Modal } from "@medflow/ui";
import { api } from "@/lib/api";
import { PageSection } from "@/components/page-section";
import { toast } from "sonner";

export function CnamCorrectifsPage(): JSX.Element {
  const queryClient = useQueryClient();

  const recordsQuery = useQuery({
    queryKey: ["cnam-rejected-records"],
    queryFn: async () => {
      const response = await api.get("/cnam/records", {
        params: { status: "REJECTED" }
      });
      return response.data as any[];
    }
  });

  const correctMutation = useMutation({
    mutationFn: async ({ rejectionId, note }: { rejectionId: string; note: string }) => {
      const response = await api.post(`/cnam/correctifs/${rejectionId}`, {
        correctiveNote: note
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success("Corrective note submitted");
      queryClient.invalidateQueries({ queryKey: ["cnam-rejected-records"] });
    }
  });

  return (
    <PageSection
      title="Corrective Workflow"
      description="Handle rejected CNAM records and submit corrective notes"
    >
      <DataTable
        data={recordsQuery.data ?? []}
        loading={recordsQuery.isLoading}
        columns={[
          {
            key: "patient",
            header: "Patient",
            render: (row: any) => `${row.patient.lastName} ${row.patient.firstName}`
          },
          {
            key: "cnamCode",
            header: "CNAM Code",
            render: (row: any) => row.cnamCode
          },
          {
            key: "amount",
            header: "Amount",
            render: (row: any) => `${Number(row.amount).toFixed(3)} TND`
          },
          {
            key: "actions",
            header: "Action",
            render: (row: any) => (
              <Modal
                trigger={<Button size="sm">Correct</Button>}
                title="Submit Corrective Note"
                description="Record will return to pending after correction"
              >
                <form
                  className="space-y-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const formData = new FormData(event.currentTarget);
                    const rejectionId = String(formData.get("rejectionId"));
                    const note = String(formData.get("note"));
                    correctMutation.mutate({ rejectionId, note });
                  }}
                >
                  <input type="hidden" name="rejectionId" value={row.bordereauItems?.[0]?.rejections?.[0]?.id ?? ""} />
                  <textarea
                    name="note"
                    required
                    className="min-h-24 w-full rounded-xl border border-slate-300 bg-transparent p-2"
                    placeholder="Corrective details"
                  />
                  <Button type="submit" disabled={correctMutation.isPending}>
                    Submit
                  </Button>
                </form>
              </Modal>
            )
          }
        ]}
        empty={<EmptyState title="No rejected records" description="No correctifs required." />}
      />
    </PageSection>
  );
}
