import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, CardContent, CardHeader, CardTitle, DataTable, Input, Modal } from "@medflow/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/features/auth/auth-context";
import { Download, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const tabs = ["overview", "timeline", "uploads", "finance"] as const;

type TabValue = (typeof tabs)[number];

export function PatientDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabValue>("overview");
  const canAccessClinicalData = user?.role !== "SECRETARY";
  const canMarkMedicalUpload = user?.role !== "SECRETARY";

  const query = useQuery({
    queryKey: ["patient-detail", id],
    queryFn: async () => {
      const response = await api.get(`/patients/${id}`);
      return response.data;
    },
    enabled: Boolean(id)
  });

  const patient = query.data;
  const uploadMutation = useMutation({
    mutationFn: async (payload: FormData) => {
      const response = await api.post("/files/upload-local", payload, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success("File uploaded");
      queryClient.invalidateQueries({ queryKey: ["patient-detail", id] });
    },
    onError: () => {
      toast.error("Upload failed");
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {patient ? `${patient.lastName} ${patient.firstName}` : "Patient"}
          </h1>
          <p className="text-sm text-slate-500">Fiche: {patient?.ficheNumber}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/app/patients")}>Back</Button>
          {canAccessClinicalData ? (
            <Button onClick={() => navigate("/app/consultations")}>New Consultation</Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Button
            key={tab}
            variant={activeTab === tab ? "default" : "secondary"}
            onClick={() => setActiveTab(tab)}
            className="capitalize"
          >
            {tab}
          </Button>
        ))}
      </div>

      {activeTab === "overview" ? (
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <Info label="CNAM" value={patient?.cnamNumber} />
            <Info label="Phone" value={patient?.phone} />
            <Info label="Address" value={patient?.address} />
            <Info label="Insurance" value={patient?.insuranceProvider} />
            <Info
              label="Medical History"
              value={canAccessClinicalData ? patient?.medicalHistory?.notes : "Restricted"}
            />
            <Info
              label="Allergies"
              value={
                canAccessClinicalData
                  ? patient?.allergies?.map((item: { name: string }) => item.name).join(", ")
                  : "Restricted"
              }
            />
            <Info
              label="Chronic Treatments"
              value={
                canAccessClinicalData
                  ? patient?.chronicTreatments
                      ?.map((item: { label: string }) => item.label)
                      .join(", ")
                  : "Restricted"
              }
            />
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "timeline" ? (
        <DataTable
          columns={[
            {
              key: "type",
              header: "Type",
              render: (row: { type: string }) => row.type
            },
            {
              key: "date",
              header: "Date",
              render: (row: { date: string }) =>
                new Date(row.date).toLocaleString("fr-TN")
            },
            {
              key: "details",
              header: "Details",
              render: (row: { details: string }) => row.details
            }
          ]}
          data={buildTimeline(patient, canAccessClinicalData)}
        />
      ) : null}

      {activeTab === "uploads" ? (
        <div className="space-y-3">
          <Modal
            trigger={<Button variant="outline">Upload File</Button>}
            title="Attach File"
            description="Attach admin or medical document to patient record"
          >
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                if (!id) {
                  toast.error("Patient not found");
                  return;
                }

                const formData = new FormData(event.currentTarget);
                const file = (formData.get("file") as File | null) ?? null;
                if (!file) {
                  toast.error("Choose a file");
                  return;
                }

                const isMedical =
                  canMarkMedicalUpload &&
                  String(formData.get("isMedical") || "false") === "true";
                const payload = new FormData();
                payload.append("file", file);
                payload.append("category", String(formData.get("category") || "ADMIN_DOC"));
                payload.append("patientId", id);
                payload.append("isMedical", String(isMedical));

                uploadMutation.mutate(payload);
              }}
            >
              <label>
                <span className="mb-1 block text-sm font-medium">Category</span>
                <select
                  name="category"
                  className="w-full rounded-xl border border-slate-300 bg-transparent p-2"
                  defaultValue={canMarkMedicalUpload ? "MEDICAL_DOC" : "ADMIN_DOC"}
                >
                  <option value="ADMIN_DOC">Admin Document</option>
                  {canMarkMedicalUpload ? (
                    <>
                      <option value="LAB_RESULT">Lab Result</option>
                      <option value="IMAGING">Imaging</option>
                      <option value="PRESCRIPTION_SCAN">Prescription Scan</option>
                    </>
                  ) : null}
                  <option value="OTHER">Other</option>
                </select>
              </label>
              {canMarkMedicalUpload ? (
                <label className="inline-flex items-center gap-2 text-sm">
                  <input name="isMedical" type="checkbox" value="true" defaultChecked />
                  Medical document
                </label>
              ) : (
                <p className="text-xs text-slate-500">
                  Secretary can upload administrative files only.
                </p>
              )}
              <Input name="file" type="file" required />
              <Button type="submit" disabled={uploadMutation.isPending}>
                {uploadMutation.isPending ? "Uploading..." : "Upload"}
              </Button>
            </form>
          </Modal>

          <DataTable
            columns={[
              {
                key: "fileName",
                header: "File",
                render: (row: any) => row.fileName
              },
              {
                key: "category",
                header: "Category",
                render: (row: any) => row.category
              },
              {
                key: "isMedical",
                header: "Type",
                render: (row: any) => (row.isMedical ? "Medical" : "Admin")
              },
              {
                key: "uploadedBy",
                header: "Uploaded By",
                render: (row: any) =>
                  row.uploadedBy ? `${row.uploadedBy.lastName} ${row.uploadedBy.firstName}` : "-"
              },
              {
                key: "createdAt",
                header: "Date",
                render: (row: any) =>
                  new Date(row.createdAt).toLocaleString("fr-TN")
              },
              {
                key: "actions",
                header: "Open / Download",
                render: (row: any) => {
                  const url = buildFileUrl(row.storagePath);
                  if (!url) {
                    return "-";
                  }

                  return (
                    <div className="flex items-center gap-2">
                      <a
                        className="inline-flex items-center gap-1 text-sky-600 hover:underline"
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Open
                      </a>
                      <a
                        className="inline-flex items-center gap-1 text-emerald-700 hover:underline"
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        download
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </a>
                    </div>
                  );
                }
              }
            ]}
            data={patient?.files ?? []}
          />
        </div>
      ) : null}

      {activeTab === "finance" ? (
        <DataTable
          columns={[
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
              render: (row: any) =>
                new Date(row.paidAt).toLocaleString("fr-TN")
            }
          ]}
          data={patient?.payments ?? []}
        />
      ) : null}
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }): JSX.Element {
  return (
    <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm">{value || "-"}</p>
    </div>
  );
}

function buildTimeline(
  patient: any,
  canAccessClinicalData: boolean
): Array<{ id: string; type: string; date: string; details: string }> {
  if (!patient) {
    return [];
  }

  const appointments = (patient.appointments ?? []).map((item: any) => ({
    id: `appt-${item.id}`,
    type: "Appointment",
    date: item.startAt,
    details: item.status
  }));

  const consultations = (patient.consultations ?? []).map((item: any) => ({
    id: `consult-${item.id}`,
    type: "Consultation",
    date: item.createdAt,
    details: canAccessClinicalData ? item.symptoms : "Restricted"
  }));

  const prescriptions = (patient.prescriptions ?? []).map((item: any) => ({
    id: `rx-${item.id}`,
    type: "Prescription",
    date: item.createdAt,
    details: `${item.lines?.length ?? 0} lines`
  }));

  const docs = (patient.generatedDocs ?? []).map((item: any) => ({
    id: `doc-${item.id}`,
    type: "Document",
    date: item.createdAt,
    details: item.title
  }));

  return [...appointments, ...consultations, ...prescriptions, ...docs].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

function buildFileUrl(storagePath?: string): string | null {
  if (!storagePath) {
    return null;
  }

  const raw = String(storagePath).trim();
  if (!raw) {
    return null;
  }

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw;
  }

  const apiBase = (import.meta.env.VITE_API_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const normalized = raw.replace(/\\/g, "/");
  if (normalized.startsWith("/")) {
    return `${apiBase}${normalized}`;
  }

  const uploadsIndex = normalized.lastIndexOf("uploads/");
  if (uploadsIndex >= 0) {
    return `${apiBase}/${normalized.slice(uploadsIndex)}`;
  }

  return `${apiBase}/${normalized.replace(/^\.?\//, "")}`;
}
