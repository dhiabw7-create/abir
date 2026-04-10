import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, DataTable, EmptyState, Input, Modal } from "@medflow/ui";
import { api } from "@/lib/api";
import { PageSection } from "@/components/page-section";
import { toast } from "sonner";

const adminTabs = ["tenants", "users", "catalog", "templates", "audit", "backups"] as const;
type AdminTab = (typeof adminTabs)[number];

interface ImportPreview {
  headers: string[];
  sampleRows: Array<Record<string, string>>;
}

export function AdminPage(): JSX.Element {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<AdminTab>("tenants");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [source, setSource] = useState("DEMO");
  const [catalogVersion, setCatalogVersion] = useState(`DEMO-${new Date().toISOString().slice(0, 10)}`);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({
    code: "",
    brandName: "",
    dciName: "",
    dosageForm: "",
    strength: "",
    familyClass: "",
    reimbursable: "",
    cnamCode: "",
    unitPrice: ""
  });

  const tenantsQuery = useQuery({
    queryKey: ["admin-tenants"],
    queryFn: async () => {
      const response = await api.get("/admin/tenants");
      return response.data as any[];
    }
  });

  const usersQuery = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const response = await api.get("/users");
      return response.data as any[];
    }
  });

  const templatesQuery = useQuery({
    queryKey: ["admin-templates"],
    queryFn: async () => {
      const response = await api.get("/documents/templates", {
        params: { includeGlobal: true }
      });
      return response.data as any[];
    }
  });

  const auditQuery = useQuery({
    queryKey: ["admin-audit"],
    queryFn: async () => {
      const response = await api.get("/admin/audit");
      return response.data as any[];
    }
  });

  const backupsQuery = useQuery({
    queryKey: ["admin-backups"],
    queryFn: async () => {
      const response = await api.get("/admin/backups");
      return response.data as any[];
    }
  });

  const catalogsQuery = useQuery({
    queryKey: ["admin-catalogs"],
    queryFn: async () => {
      const response = await api.get("/medications/catalogs");
      return response.data as any[];
    }
  });

  const createTenant = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const response = await api.post("/admin/tenants", payload);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Tenant created");
      queryClient.invalidateQueries({ queryKey: ["admin-tenants"] });
    }
  });

  const createUser = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const response = await api.post("/users", payload);
      return response.data;
    },
    onSuccess: () => {
      toast.success("User created");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    }
  });

  const triggerBackup = useMutation({
    mutationFn: async () => {
      const response = await api.post("/admin/backups/manual");
      return response.data;
    },
    onSuccess: () => {
      toast.success("Backup completed");
      queryClient.invalidateQueries({ queryKey: ["admin-backups"] });
    }
  });

  const previewMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const response = await api.post("/medications/import/preview", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });
      return response.data as ImportPreview;
    },
    onSuccess: (result) => {
      setPreview(result);
      if (result.headers.length > 0) {
        const nextMapping: Record<string, string> = { ...mapping };
        for (const key of Object.keys(nextMapping)) {
          if (!nextMapping[key] && result.headers.includes(key)) {
            nextMapping[key] = key;
          }
        }
        setMapping(nextMapping);
      }
    },
    onError: () => toast.error("Unable to preview file")
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) {
        throw new Error("No file selected");
      }
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("source", source);
      formData.append("catalogVersion", catalogVersion);
      formData.append("mapping", JSON.stringify(mapping));

      const response = await api.post("/medications/import", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });

      return response.data;
    },
    onSuccess: (result) => {
      toast.success(`Import completed (${result.success}/${result.rows})`);
      queryClient.invalidateQueries({ queryKey: ["admin-catalogs"] });
    },
    onError: () => toast.error("Catalog import failed")
  });

  const tabButtons = useMemo(
    () =>
      adminTabs.map((item) => (
        <Button
          key={item}
          variant={tab === item ? "default" : "secondary"}
          className="capitalize"
          onClick={() => setTab(item)}
        >
          {item}
        </Button>
      )),
    [tab]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">{tabButtons}</div>

      {tab === "tenants" ? (
        <PageSection
          title="Tenants"
          description="Manage clinics and plan assignments"
          action={
            <Modal
              trigger={<Button>Create Tenant</Button>}
              title="Create Tenant"
              description="Provision new clinic workspace"
            >
              <form
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  const formData = new FormData(event.currentTarget);
                  createTenant.mutate({
                    name: String(formData.get("name")),
                    slug: String(formData.get("slug")),
                    timezone: String(formData.get("timezone") || "Africa/Tunis"),
                    locale: String(formData.get("locale") || "fr")
                  });
                }}
              >
                <Input name="name" placeholder="Clinic name" required />
                <Input name="slug" placeholder="clinic-slug" required />
                <Input name="timezone" defaultValue="Africa/Tunis" />
                <select name="locale" className="w-full rounded-xl border border-slate-300 bg-transparent p-2">
                  <option value="fr">fr</option>
                  <option value="ar">ar</option>
                </select>
                <Button type="submit" disabled={createTenant.isPending}>Create</Button>
              </form>
            </Modal>
          }
        >
          <DataTable
            data={tenantsQuery.data ?? []}
            loading={tenantsQuery.isLoading}
            columns={[
              { key: "name", header: "Name", render: (row: any) => row.name },
              { key: "slug", header: "Slug", render: (row: any) => row.slug },
              { key: "plan", header: "Plan", render: (row: any) => row.plan?.name ?? "-" },
              {
                key: "users",
                header: "Users",
                render: (row: any) => row._count.users
              },
              {
                key: "patients",
                header: "Patients",
                render: (row: any) => row._count.patients
              }
            ]}
          />
        </PageSection>
      ) : null}

      {tab === "users" ? (
        <PageSection
          title="Users"
          description="Invite doctors and secretaries with role-based access"
          action={
            <Modal
              trigger={<Button>Create User</Button>}
              title="Create User"
              description="Invite doctor/secretary with initial password"
            >
              <form
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  const formData = new FormData(event.currentTarget);
                  createUser.mutate({
                    firstName: String(formData.get("firstName")),
                    lastName: String(formData.get("lastName")),
                    email: String(formData.get("email")),
                    phone: String(formData.get("phone") || ""),
                    role: String(formData.get("role")),
                    password: String(formData.get("password"))
                  });
                }}
              >
                <Input name="firstName" placeholder="First name" required />
                <Input name="lastName" placeholder="Last name" required />
                <Input name="email" type="email" placeholder="Email" required />
                <Input name="phone" placeholder="Phone" />
                <select name="role" className="w-full rounded-xl border border-slate-300 bg-transparent p-2">
                  <option value="DOCTOR">DOCTOR</option>
                  <option value="SECRETARY">SECRETARY</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                </select>
                <Input name="password" type="password" placeholder="Initial password" required />
                <Button type="submit" disabled={createUser.isPending}>Create</Button>
              </form>
            </Modal>
          }
        >
          <DataTable
            data={usersQuery.data ?? []}
            loading={usersQuery.isLoading}
            columns={[
              {
                key: "name",
                header: "Name",
                render: (row: any) => `${row.lastName} ${row.firstName}`
              },
              { key: "email", header: "Email", render: (row: any) => row.email },
              { key: "role", header: "Role", render: (row: any) => row.role.name },
              { key: "active", header: "Active", render: (row: any) => (row.isActive ? "Yes" : "No") }
            ]}
          />
        </PageSection>
      ) : null}

      {tab === "catalog" ? (
        <PageSection
          title="Medication Catalog Import"
          description="Import your Tunisia pharmacy dataset (CSV). If source is Excel, export it to CSV first."
        >
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="space-y-3">
              <Input
                type="file"
                accept=".csv"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    setSelectedFile(file);
                    previewMutation.mutate(file);
                  }
                }}
              />
              <Input value={source} onChange={(event) => setSource(event.target.value)} placeholder="Source" />
              <Input
                value={catalogVersion}
                onChange={(event) => setCatalogVersion(event.target.value)}
                placeholder="Catalog version"
              />

              {preview ? (
                <div className="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                  <p className="text-sm font-medium">Column Mapping</p>
                  {Object.keys(mapping).map((key) => (
                    <label key={key} className="flex items-center justify-between gap-2 text-sm">
                      <span className="w-40 capitalize">{key}</span>
                      <select
                        value={mapping[key] ?? ""}
                        onChange={(event) =>
                          setMapping((current) => ({
                            ...current,
                            [key]: event.target.value
                          }))
                        }
                        className="w-full rounded-lg border border-slate-300 bg-transparent p-1.5"
                      >
                        <option value="">Select column</option>
                        {preview.headers.map((header) => (
                          <option key={header} value={header}>
                            {header}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
              ) : null}

              <Button
                onClick={() => importMutation.mutate()}
                disabled={!selectedFile || importMutation.isPending}
              >
                {importMutation.isPending ? "Importing..." : "Import Catalog"}
              </Button>
            </div>

            <div className="space-y-3">
              <h3 className="font-medium">Preview Rows</h3>
              {preview?.sampleRows?.length ? (
                <div className="max-h-80 overflow-auto rounded-xl border border-slate-200 p-3 text-xs dark:border-slate-800">
                  <pre>{JSON.stringify(preview.sampleRows, null, 2)}</pre>
                </div>
              ) : (
                <EmptyState
                  title="Upload CSV to preview"
                  description="The wizard will show headers and sample data for mapping."
                />
              )}

              <h3 className="font-medium">Catalog Versions</h3>
              <DataTable
                data={catalogsQuery.data ?? []}
                columns={[
                  { key: "source", header: "Source", render: (row: any) => row.source },
                  { key: "catalogVersion", header: "Version", render: (row: any) => row.catalogVersion },
                  { key: "items", header: "Items", render: (row: any) => row._count.items },
                  { key: "isDemo", header: "DEMO", render: (row: any) => (row.isDemo ? "Yes" : "No") }
                ]}
              />
            </div>
          </div>
        </PageSection>
      ) : null}

      {tab === "templates" ? (
        <PageSection
          title="Global Template Library"
          description="Manage generic document templates and tenant overrides"
        >
          <DataTable
            data={templatesQuery.data ?? []}
            loading={templatesQuery.isLoading}
            columns={[
              { key: "name", header: "Template", render: (row: any) => row.name },
              { key: "type", header: "Type", render: (row: any) => row.type },
              { key: "language", header: "Language", render: (row: any) => row.language },
              {
                key: "scope",
                header: "Scope",
                render: (row: any) => (row.isGlobalLibrary ? "Global" : "Tenant")
              }
            ]}
          />
        </PageSection>
      ) : null}

      {tab === "audit" ? (
        <PageSection title="Audit Logs" description="Who changed what and when">
          <DataTable
            data={auditQuery.data ?? []}
            loading={auditQuery.isLoading}
            columns={[
              {
                key: "createdAt",
                header: "Date",
                render: (row: any) => new Date(row.createdAt).toLocaleString("fr-TN")
              },
              {
                key: "actor",
                header: "Actor",
                render: (row: any) =>
                  row.actor
                    ? `${row.actor.lastName} ${row.actor.firstName}`
                    : "System"
              },
              { key: "action", header: "Action", render: (row: any) => row.action },
              { key: "entity", header: "Entity", render: (row: any) => row.entity },
              { key: "entityId", header: "ID", render: (row: any) => row.entityId }
            ]}
          />
        </PageSection>
      ) : null}

      {tab === "backups" ? (
        <PageSection
          title="Backups"
          description="Daily scheduled backups + manual backup trigger"
          action={
            <Button onClick={() => triggerBackup.mutate()} disabled={triggerBackup.isPending}>
              {triggerBackup.isPending ? "Running..." : "Run Manual Backup"}
            </Button>
          }
        >
          <DataTable
            data={backupsQuery.data ?? []}
            loading={backupsQuery.isLoading}
            columns={[
              {
                key: "createdAt",
                header: "Date",
                render: (row: any) => new Date(row.createdAt).toLocaleString("fr-TN")
              },
              { key: "status", header: "Status", render: (row: any) => row.status },
              { key: "message", header: "Message", render: (row: any) => row.message ?? "-" },
              { key: "filePath", header: "File", render: (row: any) => row.filePath ?? "-" }
            ]}
          />
        </PageSection>
      ) : null}
    </div>
  );
}
