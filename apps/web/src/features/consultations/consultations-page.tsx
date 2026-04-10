import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, DataTable, EmptyState, Input, Modal } from "@medflow/ui";
import { api } from "@/lib/api";
import { PageSection } from "@/components/page-section";
import { toast } from "sonner";

export function ConsultationsPage(): JSX.Element {
  const queryClient = useQueryClient();
  const [templateText, setTemplateText] = useState("");
  const [notesText, setNotesText] = useState("");

  const consultationsQuery = useQuery({
    queryKey: ["consultations"],
    queryFn: async () => {
      const response = await api.get("/consultations", { params: { pageSize: 100 } });
      return response.data;
    }
  });

  const patientsQuery = useQuery({
    queryKey: ["consultation-patients"],
    queryFn: async () => {
      const response = await api.get("/patients", { params: { pageSize: 100 } });
      return response.data.items as Array<{ id: string; firstName: string; lastName: string }>;
    }
  });

  const doctorsQuery = useQuery({
    queryKey: ["consultation-doctors"],
    queryFn: async () => {
      const response = await api.get("/users");
      return (response.data as Array<{ id: string; firstName: string; lastName: string; role: { name: string } }>).filter(
        (user) => user.role.name === "DOCTOR"
      );
    }
  });

  const templatesQuery = useQuery({
    queryKey: ["consultation-quick-templates"],
    queryFn: async () => {
      const response = await api.get<Array<{ id: string; label: string; content: string }>>(
        "/consultations/quick-templates"
      );
      return response.data;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const response = await api.post("/consultations", payload);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Consultation created");
      queryClient.invalidateQueries({ queryKey: ["consultations"] });
      setTemplateText("");
      setNotesText("");
    },
    onError: () => toast.error("Failed to create consultation")
  });

  return (
    <div className="space-y-6">
      <PageSection
        title="Consultations"
        description="Clinical notes, diagnosis, vitals, and linked actions"
        action={
          <Modal
            trigger={<Button>New Consultation</Button>}
            title="Create Consultation"
            description="Start from patient or appointment"
          >
            <form
              className="grid grid-cols-1 gap-3 md:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                createMutation.mutate({
                  patientId: String(formData.get("patientId")),
                  doctorId: String(formData.get("doctorId")),
                  appointmentId: String(formData.get("appointmentId") || "") || undefined,
                  symptoms: String(formData.get("symptoms")),
                  diagnosisCode: String(formData.get("diagnosisCode") || "") || undefined,
                  diagnosisLabel: String(formData.get("diagnosisLabel") || "") || undefined,
                  notes: String(formData.get("notes") || notesText || templateText || ""),
                  doctorPrivateNote: String(formData.get("doctorPrivateNote") || ""),
                  bloodPressure: String(formData.get("bloodPressure") || "") || undefined,
                  pulseBpm: Number(formData.get("pulseBpm") || 0) || undefined,
                  temperatureC: Number(formData.get("temperatureC") || 0) || undefined,
                  weightKg: Number(formData.get("weightKg") || 0) || undefined,
                  heightCm: Number(formData.get("heightCm") || 0) || undefined
                });
              }}
            >
              <label>
                <span className="mb-1 block text-sm font-medium">Patient</span>
                <select name="patientId" required className="w-full rounded-xl border border-slate-300 bg-transparent p-2">
                  <option value="">Select patient</option>
                  {(patientsQuery.data ?? []).map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.lastName} {patient.firstName}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="mb-1 block text-sm font-medium">Doctor</span>
                <select name="doctorId" required className="w-full rounded-xl border border-slate-300 bg-transparent p-2">
                  <option value="">Select doctor</option>
                  {(doctorsQuery.data ?? []).map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      {doctor.lastName} {doctor.firstName}
                    </option>
                  ))}
                </select>
              </label>

              <label className="md:col-span-2">
                <span className="mb-1 block text-sm font-medium">Symptoms</span>
                <Input name="symptoms" required />
              </label>

              <label>
                <span className="mb-1 block text-sm font-medium">Diagnosis Code</span>
                <Input name="diagnosisCode" placeholder="ICD placeholder" />
              </label>

              <label>
                <span className="mb-1 block text-sm font-medium">Diagnosis Label</span>
                <Input name="diagnosisLabel" />
              </label>

              <label>
                <span className="mb-1 block text-sm font-medium">Blood Pressure</span>
                <Input name="bloodPressure" placeholder="120/80" />
              </label>

              <label>
                <span className="mb-1 block text-sm font-medium">Pulse (bpm)</span>
                <Input name="pulseBpm" type="number" />
              </label>

              <label>
                <span className="mb-1 block text-sm font-medium">Temperature</span>
                <Input name="temperatureC" type="number" step="0.1" />
              </label>

              <label>
                <span className="mb-1 block text-sm font-medium">Weight (kg)</span>
                <Input name="weightKg" type="number" step="0.1" />
              </label>

              <label>
                <span className="mb-1 block text-sm font-medium">Height (cm)</span>
                <Input name="heightCm" type="number" step="0.1" />
              </label>

              <label className="md:col-span-2">
                <span className="mb-1 block text-sm font-medium">Quick Templates</span>
                <select
                  className="w-full rounded-xl border border-slate-300 bg-transparent p-2"
                  onChange={(event) => {
                    setTemplateText(event.target.value);
                    setNotesText(event.target.value);
                  }}
                  defaultValue=""
                >
                  <option value="">Select frequent note</option>
                  {(templatesQuery.data ?? []).map((template) => (
                    <option key={template.id} value={template.content}>
                      {template.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="md:col-span-2">
                <span className="mb-1 block text-sm font-medium">Notes</span>
                <textarea
                  name="notes"
                  value={notesText}
                  onChange={(event) => setNotesText(event.target.value)}
                  className="min-h-28 w-full rounded-xl border border-slate-300 bg-transparent p-2"
                />
              </label>

              <label className="md:col-span-2">
                <span className="mb-1 block text-sm font-medium">Doctor Private Notes</span>
                <textarea
                  name="doctorPrivateNote"
                  className="min-h-20 w-full rounded-xl border border-slate-300 bg-transparent p-2"
                />
              </label>

              <div className="md:col-span-2 flex justify-end">
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Saving..." : "Create Consultation"}
                </Button>
              </div>
            </form>
          </Modal>
        }
      >
        <DataTable
          loading={consultationsQuery.isLoading}
          data={consultationsQuery.data?.items ?? []}
          columns={[
            {
              key: "patient",
              header: "Patient",
              render: (row: any) => `${row.patient.lastName} ${row.patient.firstName}`
            },
            {
              key: "doctor",
              header: "Doctor",
              render: (row: any) => `${row.doctor.lastName} ${row.doctor.firstName}`
            },
            {
              key: "diagnosis",
              header: "Diagnosis",
              render: (row: any) => row.diagnosis?.label ?? row.diagnosis?.code ?? "-"
            },
            {
              key: "createdAt",
              header: "Date",
              render: (row: any) => new Date(row.createdAt).toLocaleString("fr-TN")
            }
          ]}
          empty={
            <EmptyState
              title="No consultations"
              description="Start consultation from appointment or patient card."
            />
          }
        />
      </PageSection>
    </div>
  );
}
