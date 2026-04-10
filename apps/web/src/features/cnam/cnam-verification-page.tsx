import { useQuery } from "@tanstack/react-query";
import { DataTable, EmptyState } from "@medflow/ui";
import { api } from "@/lib/api";
import { PageSection } from "@/components/page-section";

export function CnamVerificationPage(): JSX.Element {
  const query = useQuery({
    queryKey: ["cnam-verification"],
    queryFn: async () => {
      const response = await api.get("/cnam/verification");
      return response.data as Array<{
        id?: string;
        consultationId: string;
        patientName: string;
        patientCnam?: string;
        hasRecord: boolean;
        eligible: boolean;
      }>;
    }
  });

  return (
    <PageSection
      title="CNAM Daily Verification"
      description="Verify consultation eligibility before bordereau generation"
    >
      <DataTable<any>
        data={(query.data ?? []).map((row) => ({
          ...row,
          id: row.id ?? row.consultationId
        }))}
        loading={query.isLoading}
        columns={[
          {
            key: "consultationId",
            header: "Consultation",
            render: (row) => row.consultationId.slice(0, 8)
          },
          {
            key: "patientName",
            header: "Patient",
            render: (row) => row.patientName
          },
          {
            key: "patientCnam",
            header: "CNAM",
            render: (row) => row.patientCnam ?? "-"
          },
          {
            key: "eligible",
            header: "Eligible",
            render: (row) => (row.eligible ? "Yes" : "No")
          },
          {
            key: "hasRecord",
            header: "Tracked",
            render: (row) => (row.hasRecord ? "Yes" : "No")
          }
        ]}
        empty={<EmptyState title="No consultations" description="No verification records for today." />}
      />
    </PageSection>
  );
}
