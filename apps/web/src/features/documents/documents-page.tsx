import { type ComponentType, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, DataTable, EmptyState, Input, Modal } from "@medflow/ui";
import { api } from "@/lib/api";
import { PageSection } from "@/components/page-section";
import { useAuth } from "@/features/auth/auth-context";
import { useI18n } from "@/lib/i18n-context";
import {
  Download,
  ExternalLink,
  FileCheck2,
  HeartPulse,
  Printer,
  School2,
  UserRoundCheck
} from "lucide-react";
import { toast } from "sonner";

const templateTypes = [
  "MEDICAL_CERTIFICATE",
  "SICK_LEAVE",
  "SCHOOL_CERTIFICATE",
  "FITNESS_CERTIFICATE",
  "REFERRAL",
  "IMAGING_REQUEST",
  "LAB_REQUEST",
  "INVOICE",
  "RECEIPT",
  "CNAM_GENERIC"
];

const doctorQuickTypes = [
  "MEDICAL_CERTIFICATE",
  "SICK_LEAVE",
  "SCHOOL_CERTIFICATE",
  "FITNESS_CERTIFICATE"
];

const doctorQuickTypeLabels: Record<string, string> = {
  MEDICAL_CERTIFICATE: "Certificat Medical",
  SICK_LEAVE: "Arret de Travail",
  SCHOOL_CERTIFICATE: "Certificat Scolaire",
  FITNESS_CERTIFICATE: "Aptitude Sportive"
};

const templateTypeLabelsAr: Record<string, string> = {
  MEDICAL_CERTIFICATE: "شهادة طبية",
  SICK_LEAVE: "شهادة راحة مرضية",
  SCHOOL_CERTIFICATE: "شهادة مدرسية",
  FITNESS_CERTIFICATE: "شهادة اللياقة البدنية",
  REFERRAL: "رسالة توجيه",
  IMAGING_REQUEST: "طلب تصوير طبي",
  LAB_REQUEST: "طلب تحاليل",
  INVOICE: "فاتورة",
  RECEIPT: "وصل خلاص",
  CNAM_GENERIC: "وثيقة CNAM عامة"
};

const languageLabelsAr: Record<string, string> = {
  FR: "فرنسية",
  AR: "عربية",
  BILINGUAL: "ثنائي اللغة"
};

const quickModelCards: Array<{
  type: string;
  title: string;
  subtitle: string;
  accentClass: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  {
    type: "MEDICAL_CERTIFICATE",
    title: "Certificat Medical",
    subtitle: "Consultation medicale standard",
    accentClass: "from-sky-100 to-sky-50 dark:from-sky-900/40 dark:to-slate-900",
    icon: FileCheck2
  },
  {
    type: "SICK_LEAVE",
    title: "Arret de Travail",
    subtitle: "Repos medical avec duree",
    accentClass: "from-amber-100 to-amber-50 dark:from-amber-900/30 dark:to-slate-900",
    icon: HeartPulse
  },
  {
    type: "SCHOOL_CERTIFICATE",
    title: "Certificat Scolaire",
    subtitle: "Reprise des etudes",
    accentClass: "from-emerald-100 to-emerald-50 dark:from-emerald-900/30 dark:to-slate-900",
    icon: School2
  },
  {
    type: "FITNESS_CERTIFICATE",
    title: "Aptitude Sportive",
    subtitle: "Aptitude aux activites sportives",
    accentClass: "from-fuchsia-100 to-fuchsia-50 dark:from-fuchsia-900/30 dark:to-slate-900",
    icon: UserRoundCheck
  }
];

export function DocumentsPage(): JSX.Element {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { language } = useI18n();
  const isArabic = language === "ar";
  const roleLabel = getRoleLabel(user?.role, isArabic);
  const [selectedQuickType, setSelectedQuickType] = useState<string>("MEDICAL_CERTIFICATE");
  const [sickLeaveDays, setSickLeaveDays] = useState<number>(3);
  const [lastGenerated, setLastGenerated] = useState<{
    title: string;
    url: string;
  } | null>(null);
  const [editorBody, setEditorBody] = useState(
    "Certifie que {{patient.firstName}} {{patient.lastName}} est consulte le {{date}}."
  );

  const canAccessTemplateLibrary = user?.role === "SUPER_ADMIN" || user?.role === "DOCTOR";
  const canManageTemplates = user?.role === "SUPER_ADMIN";
  const canGenerateDocuments = user?.role === "SUPER_ADMIN" || user?.role === "DOCTOR";

  const templatesQuery = useQuery({
    queryKey: ["document-templates"],
    enabled: canAccessTemplateLibrary,
    queryFn: async () => {
      const response = await api.get("/documents/templates", {
        params: { includeGlobal: true }
      });
      return response.data as any[];
    }
  });

  const generatedQuery = useQuery({
    queryKey: ["generated-documents"],
    queryFn: async () => {
      const response = await api.get("/documents/generated");
      return response.data as any[];
    }
  });

  const patientsQuery = useQuery({
    queryKey: ["document-patients"],
    enabled: canGenerateDocuments,
    queryFn: async () => {
      const response = await api.get("/patients", { params: { pageSize: 100 } });
      return response.data.items as Array<{ id: string; firstName: string; lastName: string }>;
    }
  });

  const quickTemplatesQuery = useQuery({
    queryKey: ["document-quick-templates"],
    enabled: canGenerateDocuments,
    queryFn: async () => {
      const response = await api.get("/documents/doctor-quick-templates");
      return response.data as Array<{
        id: string;
        name: string;
        type: string;
        language: string;
      }>;
    }
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const response = await api.post("/documents/templates", payload);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Template saved");
      queryClient.invalidateQueries({ queryKey: ["document-templates"] });
    }
  });

  const generateMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const response = await api.post("/documents/generate-by-type", payload);
      return response.data;
    },
    onSuccess: (generated) => {
      toast.success("Document generated");
      queryClient.invalidateQueries({ queryKey: ["generated-documents"] });

      const url = buildDocumentUrl(generated?.filePath);
      if (url) {
        setLastGenerated({
          title: generated?.title ?? "Generated certificate",
          url
        });
        const popup = window.open(url, "_blank", "noopener,noreferrer");
        if (!popup) {
          toast.message("Popup blocked. Use Open PDF button below.");
        }
      }
    }
  });

  const quickTemplateByType = useMemo(() => {
    const map = new Map<string, { id: string; name: string; type: string; language: string }>();
    (quickTemplatesQuery.data ?? []).forEach((item) => {
      map.set(item.type, item);
    });
    return map;
  }, [quickTemplatesQuery.data]);

  return (
    <div className="space-y-6">
      {canAccessTemplateLibrary ? (
        <PageSection
          title={isArabic ? "قوالب الوثائق" : "Document Templates"}
          description={
            isArabic
              ? "قوالب عامة + قوالب خاصة بالعيادة مع محرر المتغيرات"
              : "Global templates + tenant overrides with placeholder editor"
          }
          action={
            canManageTemplates ? (
              <Modal
                trigger={<Button>{isArabic ? "قالب جديد" : "New Template"}</Button>}
                title={isArabic ? "محرر القوالب" : "Template Editor"}
                description={
                  isArabic
                    ? "استعمل المتغيرات مثل {{patient.firstName}} و {{days}} و {{date}}"
                    : "Use placeholders like {{patient.firstName}}, {{days}}, {{date}}"
                }
              >
                <form
                  className="space-y-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const formData = new FormData(event.currentTarget);
                    createTemplateMutation.mutate({
                      name: String(formData.get("name")),
                      type: String(formData.get("type")),
                      language: String(formData.get("language")),
                      body: editorBody,
                      footer: String(formData.get("footer") || ""),
                      isGlobalLibrary:
                        String(formData.get("isGlobalLibrary") || "false") === "true"
                    });
                  }}
                >
                  <Input
                    name="name"
                    placeholder={isArabic ? "اسم القالب" : "Template name"}
                    required
                  />
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <select name="type" className="rounded-xl border border-slate-300 bg-transparent p-2" required>
                      {templateTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                    <select name="language" className="rounded-xl border border-slate-300 bg-transparent p-2" required>
                      <option value="FR">FR</option>
                      <option value="AR">AR</option>
                      <option value="BILINGUAL">BILINGUAL</option>
                    </select>
                  </div>
                  <textarea
                    className="min-h-60 w-full rounded-xl border border-slate-300 bg-transparent p-2 font-mono text-sm"
                    value={editorBody}
                    onChange={(event) => setEditorBody(event.target.value)}
                  />
                  <Input name="footer" placeholder="Footer text" />
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input name="isGlobalLibrary" type="checkbox" value="true" />
                    {isArabic ? "قالب من المكتبة العامة" : "Global library template"}
                  </label>
                  <div className="rounded-lg border border-dashed border-slate-300 p-2 text-xs text-slate-500">
                    {isArabic ? "المتغيرات:" : "Placeholders:"} {"{{patient.firstName}}"}, {"{{patient.lastName}}"},
                    {"{{patient.cnamNumber}}"}, {"{{days}}"}, {"{{date}}"}, {"{{payload.notes}}"}
                  </div>
                  <Button type="submit" disabled={createTemplateMutation.isPending}>
                    {isArabic ? "حفظ القالب" : "Save Template"}
                  </Button>
                </form>
              </Modal>
            ) : null
          }
        >
          <DataTable
            data={templatesQuery.data ?? []}
            loading={templatesQuery.isLoading}
            columns={[
              {
                key: "name",
                header: isArabic ? "القالب" : "Template",
                render: (row: any) => row.name
              },
              {
                key: "type",
                header: isArabic ? "النوع" : "Type",
                render: (row: any) => getTemplateTypeLabel(row.type, isArabic)
              },
              {
                key: "language",
                header: isArabic ? "اللغة" : "Language",
                render: (row: any) => getLanguageLabel(row.language, isArabic)
              },
              {
                key: "scope",
                header: isArabic ? "النطاق" : "Scope",
                render: (row: any) => (row.isGlobalLibrary ? (isArabic ? "عام" : "Global") : isArabic ? "العيادة" : "Tenant")
              }
            ]}
            empty={
              <EmptyState
                title={isArabic ? "لا توجد قوالب" : "No templates"}
                description={isArabic ? "أنشئ أول قالب." : "Create your first template."}
              />
            }
          />
        </PageSection>
      ) : (
        <PageSection
          title={isArabic ? "الوثائق" : "Documents"}
          description={
            isArabic
              ? `واجهة ${roleLabel}: عرض وطباعة وتتبع الوثائق المولدة`
              : "Secretary view: print and track generated documents."
          }
        >
          <p className="text-sm text-slate-500">
            {isArabic
              ? "إدارة القوالب وتوليد الوثائق متاحة للطبيب ومدير المنصة."
              : "Template management and document generation are available for doctors and super admins."}
          </p>
        </PageSection>
      )}

      <PageSection
        title="Generated Documents"
        description="Auto-filled and rendered PDFs"
        action={
          canGenerateDocuments ? (
            <Modal
              trigger={<Button>Generate Certificate</Button>}
              title="Doctor Quick Certificates"
              description="Select patient and certificate type. The model is generated prefilled."
            >
              <form
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  setLastGenerated(null);
                  if (selectedQuickType === "SICK_LEAVE" && (!Number.isFinite(sickLeaveDays) || sickLeaveDays < 1)) {
                    toast.error("حدد عدد أيام الراحة المرضية");
                    return;
                  }
                  const formData = new FormData(event.currentTarget);
                  generateMutation.mutate({
                    patientId: String(formData.get("patientId")),
                    type: selectedQuickType,
                    days: selectedQuickType === "SICK_LEAVE" ? sickLeaveDays : undefined
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
                <div>
                  <p className="mb-2 text-sm font-medium">Certificate Type Model</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {quickModelCards.map((model) => {
                      if (!doctorQuickTypes.includes(model.type)) {
                        return null;
                      }

                      const Icon = model.icon;
                      const selected = selectedQuickType === model.type;
                      const quickTemplate = quickTemplateByType.get(model.type);

                      return (
                        <button
                          key={model.type}
                          type="button"
                          onClick={() => setSelectedQuickType(model.type)}
                          className={`rounded-xl border p-3 text-left transition ${
                            selected
                              ? "border-sky-500 ring-2 ring-sky-200 dark:ring-sky-900"
                              : "border-slate-300 hover:border-slate-400 dark:border-slate-700"
                          }`}
                        >
                          <div className={`rounded-lg bg-gradient-to-br p-3 ${model.accentClass}`}>
                            <div className="mb-2 flex items-center gap-2">
                              <Icon className="h-4 w-4 text-slate-700 dark:text-slate-200" />
                              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                                {model.title}
                              </p>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-300">{model.subtitle}</p>
                            <div className="mt-2 space-y-1">
                              <div className="h-1.5 rounded bg-slate-300/70 dark:bg-slate-600/70" />
                              <div className="h-1.5 w-5/6 rounded bg-slate-300/70 dark:bg-slate-600/70" />
                              <div className="h-1.5 w-4/6 rounded bg-slate-300/70 dark:bg-slate-600/70" />
                            </div>
                          </div>
                          <p className="mt-2 text-xs text-slate-500">
                            {quickTemplate?.name ?? doctorQuickTypeLabels[model.type] ?? model.type}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {selectedQuickType === "SICK_LEAVE" ? (
                  <label>
                    <span className="mb-1 block text-sm font-medium">Arret (jours)</span>
                    <Input
                      type="number"
                      min={1}
                      max={90}
                      value={sickLeaveDays}
                      required
                      onChange={(event) => setSickLeaveDays(Number(event.target.value) || 3)}
                    />
                  </label>
                ) : null}

                <Button
                  type="submit"
                  disabled={generateMutation.isPending || quickTemplatesQuery.isLoading}
                >
                  Generate Ready Model
                </Button>

                {lastGenerated ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/30">
                    <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                      PDF ready: {lastGenerated.title}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Button asChild size="sm">
                        <a href={lastGenerated.url} target="_blank" rel="noreferrer">
                          <ExternalLink className="mr-1 h-3.5 w-3.5" />
                          Open PDF
                        </a>
                      </Button>
                      <Button asChild size="sm" variant="outline">
                        <a href={lastGenerated.url} target="_blank" rel="noreferrer">
                          <Printer className="mr-1 h-3.5 w-3.5" />
                          Print
                        </a>
                      </Button>
                      <Button asChild size="sm" variant="outline">
                        <a href={lastGenerated.url} target="_blank" rel="noreferrer" download>
                          <Download className="mr-1 h-3.5 w-3.5" />
                          Download
                        </a>
                      </Button>
                    </div>
                  </div>
                ) : null}
              </form>
            </Modal>
          ) : null
        }
      >
        <DataTable
          data={generatedQuery.data ?? []}
          loading={generatedQuery.isLoading}
          columns={[
            {
              key: "title",
              header: "Title",
              render: (row: any) => row.title
            },
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
              key: "template",
              header: "Template",
              render: (row: any) => row.template.name
            },
            {
              key: "filePath",
              header: "Open / Print",
              render: (row: any) => (
                (() => {
                  const url = buildDocumentUrl(row.filePath);
                  if (!url) {
                    return "-";
                  }

                  return (
                    <div className="flex items-center gap-2">
                      <a
                        className="text-sky-600 hover:underline"
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open PDF
                      </a>
                      <a
                        className="inline-flex items-center gap-1 text-emerald-600 hover:underline"
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        Print
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
                })()
              )
            }
          ]}
          empty={<EmptyState title="No generated docs" description="Generate first document." />}
        />
      </PageSection>
    </div>
  );
}

function getRoleLabel(role: string | undefined, isArabic: boolean): string {
  if (!role) {
    return isArabic ? "مستخدم" : "User";
  }

  if (!isArabic) {
    return role;
  }

  if (role === "SUPER_ADMIN") {
    return "مدير المنصة";
  }
  if (role === "DOCTOR") {
    return "طبيب";
  }
  if (role === "SECRETARY") {
    return "كاتب(ة) طبيب";
  }
  return role;
}

function getTemplateTypeLabel(type: string, isArabic: boolean): string {
  if (!isArabic) {
    return type;
  }
  return templateTypeLabelsAr[type] ?? type;
}

function getLanguageLabel(language: string, isArabic: boolean): string {
  if (!isArabic) {
    return language;
  }
  return languageLabelsAr[language] ?? language;
}

function buildDocumentUrl(filePath?: string): string | null {
  if (!filePath) {
    return null;
  }

  const raw = String(filePath).trim();
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
