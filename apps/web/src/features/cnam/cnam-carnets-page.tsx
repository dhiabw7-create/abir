import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button, DataTable, EmptyState, Input } from "@medflow/ui";
import { Search } from "lucide-react";
import { api } from "@/lib/api";
import { PageSection } from "@/components/page-section";
import { toast } from "sonner";

export function CnamCarnetsPage(): JSX.Element {
  const [search, setSearch] = useState("");

  const query = useQuery({
    queryKey: ["cnam-carnets", search],
    queryFn: async () => {
      const response = await api.get("/cnam/carnets", {
        params: { search }
      });
      return response.data as any[];
    }
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post("/cnam/carnets/export", null, {
        params: { search }
      });
      return response.data;
    },
    onSuccess: (result) => {
      toast.success(`Carnets exported (${result.rows} rows)`);
    }
  });

  return (
    <PageSection
      title="Carnet Management"
      description="List, search, and export CNAM carnet records"
      action={
        <Button onClick={() => exportMutation.mutate()} disabled={exportMutation.isPending}>
          {exportMutation.isPending ? "Exporting..." : "Export CSV"}
        </Button>
      }
    >
      <label className="mb-4 block max-w-sm">
        <Search className="pointer-events-none absolute mt-3 ml-3 h-4 w-4 text-slate-400" />
        <Input
          className="pl-9"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search patient, CNAM number, code"
        />
      </label>

      <DataTable
        data={query.data ?? []}
        loading={query.isLoading}
        columns={[
          {
            key: "patient",
            header: "Patient",
            render: (row: any) => row.patient
          },
          {
            key: "cnamNumber",
            header: "CNAM Number",
            render: (row: any) => row.cnamNumber ?? "-"
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
            key: "status",
            header: "Status",
            render: (row: any) => row.status
          }
        ]}
        empty={<EmptyState title="No carnet rows" description="No records match your filters." />}
      />
    </PageSection>
  );
}
