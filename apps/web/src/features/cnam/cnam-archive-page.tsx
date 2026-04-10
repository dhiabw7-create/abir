import { useQuery } from "@tanstack/react-query";
import { DataTable, EmptyState } from "@medflow/ui";
import { api } from "@/lib/api";
import { PageSection } from "@/components/page-section";

export function CnamArchivePage(): JSX.Element {
  const query = useQuery({
    queryKey: ["cnam-archive"],
    queryFn: async () => {
      const response = await api.get("/cnam/archive");
      return response.data as any[];
    }
  });

  return (
    <PageSection
      title="CNAM Archive"
      description="Track exported bordereaux, payments and rejection history"
    >
      <DataTable
        data={query.data ?? []}
        loading={query.isLoading}
        columns={[
          {
            key: "reference",
            header: "Reference",
            render: (row: any) => row.reference
          },
          {
            key: "status",
            header: "Status",
            render: (row: any) => row.status
          },
          {
            key: "items",
            header: "Items",
            render: (row: any) => row.items.length
          },
          {
            key: "exports",
            header: "Exports",
            render: (row: any) => row.exports.length
          }
        ]}
        empty={<EmptyState title="No archive" description="No archived/exported bordereaux yet." />}
      />
    </PageSection>
  );
}
