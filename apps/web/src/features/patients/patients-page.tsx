import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button, DataTable, Input, EmptyState, Badge } from "@medflow/ui";
import { Plus, Search } from "lucide-react";
import { api } from "@/lib/api";
import { PageSection } from "@/components/page-section";
import { useDebounce } from "@/hooks/use-debounce";

interface PatientRow {
  id: string;
  ficheNumber: string;
  firstName: string;
  lastName: string;
  phone: string;
  cnamNumber?: string | null;
  lastVisitAt?: string | null;
}

interface PatientsResponse {
  items: PatientRow[];
  total: number;
  page: number;
  pageSize: number;
}

export function PatientsPage(): JSX.Element {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 350);

  const query = useQuery({
    queryKey: ["patients", debouncedSearch, page],
    queryFn: async () => {
      const response = await api.get<PatientsResponse>("/patients", {
        params: {
          page,
          pageSize: 15,
          search: debouncedSearch
        }
      });

      return response.data;
    }
  });

  const columns = useMemo(
    () => [
      {
        key: "ficheNumber",
        header: "Fiche",
        render: (row: PatientRow) => row.ficheNumber
      },
      {
        key: "name",
        header: "Patient",
        render: (row: PatientRow) => `${row.lastName} ${row.firstName}`
      },
      {
        key: "phone",
        header: "Phone",
        render: (row: PatientRow) => row.phone
      },
      {
        key: "cnamNumber",
        header: "CNAM",
        render: (row: PatientRow) => row.cnamNumber ?? "-"
      },
      {
        key: "lastVisitAt",
        header: "Last Visit",
        render: (row: PatientRow) =>
          row.lastVisitAt
            ? new Date(row.lastVisitAt).toLocaleDateString("fr-TN")
            : "-"
      }
    ],
    []
  );

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-2"
      >
        <h1 className="text-3xl font-bold tracking-tight gradient-text-medical">Patients</h1>
        <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-400">
          Manage patient records, medical history, and CNAM information
        </p>
      </motion.div>

      <PageSection
        title="Patient Directory"
        description="Search and manage patient records with advanced filtering"
        action={
          <Button onClick={() => navigate("/app/patients/new")}> 
            <Plus className="mr-2 h-4 w-4" />
            New Patient
          </Button>
        }
      >
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search by name, fiche, CNAM, phone..."
              className="pl-11"
            />
          </label>
          <div className="flex items-center gap-3">
            <Badge variant="medical" className="text-xs">
              Total: {query.data?.total ?? 0}
            </Badge>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={query.data?.items ?? []}
          loading={query.isLoading}
          onRowClick={(row) => navigate(`/app/patients/${row.id}`)}
          empty={
            <EmptyState
              title="No patient found"
              description="Adjust filters or create the first patient record."
            />
          }
        />

        <div className="mt-6 flex items-center justify-between border-t border-slate-200/60 pt-4 dark:border-slate-800/60">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            Showing {query.data?.items.length ?? 0} of {query.data?.total ?? 0} patients
          </p>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
              className="font-medium"
            >
              Previous
            </Button>
            <Badge variant="info" className="min-w-[80px] justify-center">
              Page {page}
            </Badge>
            <Button
              variant="outline"
              disabled={(query.data?.items.length ?? 0) < 15}
              onClick={() => setPage((current) => current + 1)}
              className="font-medium"
            >
              Next
            </Button>
          </div>
        </div>
      </PageSection>
    </div>
  );
}
