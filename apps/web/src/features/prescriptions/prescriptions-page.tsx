import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Badge, Button, DataTable, EmptyState, Input, Modal } from "@medflow/ui";
import {
  Plus,
  Trash2,
  Search,
  Pill,
  AlertTriangle,
  FileText,
  User,
  UserCircle,
  Calculator,
  CheckCircle2,
  Clock,
  DollarSign,
  FileDown,
  Sparkles,
  Stethoscope,
  Calendar
} from "lucide-react";
import { api } from "@/lib/api";
import { PageSection } from "@/components/page-section";
import { useDebounce } from "@/hooks/use-debounce";
import { toast } from "sonner";

interface DraftLine {
  id: string;
  searchText: string;
  medicationItemId?: string;
  medicationLabel: string;
  dose: string;
  frequency: string;
  durationDays: number;
  quantity: number;
  unitPrice?: number;
  instructions?: string;
}

interface MedicationOption {
  id: string;
  code?: string;
  brandName: string;
  dciName?: string;
  strength?: string;
  dosageForm?: string;
  cnamCode?: string;
  prices?: Array<{ unitPrice: number }>;
}

interface MedicationCatalogOption {
  id: string;
  source: string;
  catalogVersion: string;
  createdAt: string;
}

export function PrescriptionsPage(): JSX.Element {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeLineId, setActiveLineId] = useState<string | null>(null);
  const [lines, setLines] = useState<DraftLine[]>([
    {
      id: crypto.randomUUID(),
      searchText: "",
      medicationLabel: "",
      dose: "",
      frequency: "",
      durationDays: 7,
      quantity: 1
    }
  ]);

  const prescriptionsQuery = useQuery({
    queryKey: ["prescriptions"],
    queryFn: async () => {
      const response = await api.get("/prescriptions", { params: { pageSize: 100 } });
      return response.data;
    }
  });

  const patientsQuery = useQuery({
    queryKey: ["prescription-patients"],
    queryFn: async () => {
      const response = await api.get("/patients", { params: { pageSize: 100 } });
      return response.data.items as Array<{ id: string; firstName: string; lastName: string }>;
    }
  });

  const doctorsQuery = useQuery({
    queryKey: ["prescription-doctors"],
    queryFn: async () => {
      const response = await api.get("/users");
      return (response.data as Array<{ id: string; firstName: string; lastName: string; role: { name: string } }>).filter(
        (user) => user.role.name === "DOCTOR"
      );
    }
  });

  const catalogsQuery = useQuery({
    queryKey: ["prescription-medication-catalogs"],
    queryFn: async () => {
      const response = await api.get("/medications/catalogs");
      return response.data as MedicationCatalogOption[];
    }
  });

  const activeLine = lines.find((line) => line.id === activeLineId);
  const debouncedMedicationSearch = useDebounce(activeLine?.searchText?.trim() ?? "", 250);
  const preferredPricedCatalog = (catalogsQuery.data ?? [])
    .filter((catalog) => catalog.source === "PHARMA_TUNISIE_MEDOC")
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];

  const medicationsQuery = useQuery({
    queryKey: ["medications-search", debouncedMedicationSearch, preferredPricedCatalog?.id],
    enabled: debouncedMedicationSearch.length >= 2,
    queryFn: async () => {
      const response = await api.get("/medications/items", {
        params: {
          search: debouncedMedicationSearch,
          pageSize: 12,
          catalogId: preferredPricedCatalog?.id
        }
      });

      const primary = response.data.items as MedicationOption[];
      if (primary.length > 0 || !preferredPricedCatalog?.id) {
        return primary;
      }

      const fallback = await api.get("/medications/items", {
        params: {
          search: debouncedMedicationSearch,
          pageSize: 12
        }
      });

      return fallback.data.items as MedicationOption[];
    }
  });

  const interactionQuery = useQuery({
    queryKey: ["prescription-interactions", lines.map((line) => line.medicationItemId).join(",")],
    queryFn: async () => {
      const ids = lines.map((line) => line.medicationItemId).filter(Boolean) as string[];
      if (ids.length === 0) {
        return [];
      }

      const response = await api.get("/medications/interactions", {
        params: { itemId: ids[0] }
      });
      return response.data as Array<{
        id: string;
        severity: string;
        description: string;
      }>;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const response = await api.post("/prescriptions", payload);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Prescription saved");
      queryClient.invalidateQueries({ queryKey: ["prescriptions"] });
      setLines([
        {
          id: crypto.randomUUID(),
          searchText: "",
          medicationLabel: "",
          dose: "",
          frequency: "",
          durationDays: 7,
          quantity: 1
        }
      ]);
    },
    onError: () => toast.error("Failed to save prescription")
  });

  const estimatedTotal = useMemo(
    () =>
      lines.reduce((sum, line) => sum + (line.unitPrice ? line.unitPrice * line.quantity : 0), 0),
    [lines]
  );

  const updateLine = (id: string, field: keyof DraftLine, value: unknown): void => {
    setLines((current) =>
      current.map((line) =>
        line.id === id ? { ...line, [field]: value } : line
      )
    );
  };

  const addLine = (): void => {
    setLines((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        searchText: "",
        medicationLabel: "",
        dose: "",
        frequency: "",
        durationDays: 7,
        quantity: 1
      }
    ]);
  };

  const selectMedication = (lineId: string, option: MedicationOption): void => {
    const label = buildMedicationLabel(option);
    const suggestedDose = option.strength?.trim() ?? "";
    const suggestedInstruction = option.dosageForm?.trim() ?? "";

    updateLine(lineId, "searchText", label);
    updateLine(lineId, "medicationItemId", option.id);
    updateLine(lineId, "medicationLabel", label);
    updateLine(lineId, "dose", suggestedDose);
    if (suggestedInstruction) {
      updateLine(lineId, "instructions", suggestedInstruction);
    }
    updateLine(lineId, "unitPrice", option.prices?.[0]?.unitPrice ?? undefined);
    setActiveLineId(null);
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-4"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 shadow-lg shadow-blue-500/30">
            <Pill className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight gradient-text-medical">Prescriptions</h1>
            <p className="mt-2 text-base font-medium text-slate-600 dark:text-slate-400">
              Create and manage patient prescriptions with medication catalog integration
            </p>
          </div>
        </div>
      </motion.div>

      <PageSection
        title="Prescription Management"
        description="Professional medication builder with real-time cost estimation and drug interaction warnings"
        action={
          <Modal
            trigger={
              <Button className="group">
                <Plus className="mr-2 h-4 w-4 transition-transform group-hover:rotate-90" />
                New Prescription
              </Button>
            }
            title={
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500">
                  <Stethoscope className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Prescription Builder</h2>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    Search medication catalog and generate patient treatment lines
                  </p>
                </div>
              </div>
            }
            description=""
          >
            <motion.form
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="space-y-6"
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);

                createMutation.mutate({
                  patientId: String(formData.get("patientId")),
                  doctorId: String(formData.get("doctorId")),
                  notes: String(formData.get("notes") || ""),
                  lines: lines.map((line) => ({
                    medicationItemId: line.medicationItemId,
                    medicationLabel: line.medicationLabel || line.searchText,
                    dose: line.dose,
                    frequency: line.frequency,
                    durationDays: Number(line.durationDays),
                    quantity: Number(line.quantity),
                    unitPrice: line.unitPrice,
                    instructions: line.instructions
                  }))
                });
              }}
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <motion.label
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="group"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <User className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                    <span className="text-sm font-bold uppercase tracking-[0.05em] text-slate-700 dark:text-slate-300">
                      Patient
                    </span>
                  </div>
                  <div className="relative">
                    <select
                      name="patientId"
                      required
                      className="medical-card-hover w-full rounded-xl border border-slate-300 bg-white/95 px-4 py-3 text-sm font-medium text-slate-900 shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/70 focus-visible:border-sky-400 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-100 dark:focus-visible:border-sky-600"
                    >
                      <option value="">Select patient...</option>
                      {(patientsQuery.data ?? []).map((patient) => (
                        <option key={patient.id} value={patient.id}>
                          {patient.lastName} {patient.firstName}
                        </option>
                      ))}
                    </select>
                  </div>
                </motion.label>

                <motion.label
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 }}
                  className="group"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <UserCircle className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                    <span className="text-sm font-bold uppercase tracking-[0.05em] text-slate-700 dark:text-slate-300">
                      Doctor
                    </span>
                  </div>
                  <div className="relative">
                    <select
                      name="doctorId"
                      required
                      className="medical-card-hover w-full rounded-xl border border-slate-300 bg-white/95 px-4 py-3 text-sm font-medium text-slate-900 shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/70 focus-visible:border-sky-400 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-100 dark:focus-visible:border-sky-600"
                    >
                      <option value="">Select doctor...</option>
                      {(doctorsQuery.data ?? []).map((doctor) => (
                        <option key={doctor.id} value={doctor.id}>
                          {doctor.lastName} {doctor.firstName}
                        </option>
                      ))}
                    </select>
                  </div>
                </motion.label>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="medical-card rounded-2xl border border-slate-200/60 bg-gradient-to-br from-white/50 to-slate-50/30 p-5 dark:border-slate-800/60 dark:from-slate-900/50 dark:to-slate-950/30"
              >
                <div className="mb-4 flex items-center justify-between border-b border-slate-200/60 pb-4 dark:border-slate-800/60">
                  <div className="flex items-center gap-2">
                    <Pill className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <p className="text-base font-bold text-slate-900 dark:text-slate-100">Medication Lines</p>
                    <Badge variant="medical" className="ml-2">
                      {lines.length} {lines.length === 1 ? "medication" : "medications"}
                    </Badge>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={addLine}
                    className="group"
                  >
                    <Plus className="mr-1.5 h-4 w-4 transition-transform group-hover:rotate-90" />
                    Add Medication
                  </Button>
                </div>

                <div className="space-y-4">
                  <AnimatePresence mode="popLayout">
                    {lines.map((line, index) => (
                      <motion.div
                        key={line.id}
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="group medical-card-hover relative overflow-hidden rounded-xl border border-slate-200/80 bg-white/80 p-4 shadow-sm dark:border-slate-700/80 dark:bg-slate-900/60"
                      >
                        <div className="mb-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/10 to-cyan-500/10 dark:from-blue-500/20 dark:to-cyan-500/20">
                              <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                {index + 1}
                              </span>
                            </div>
                            <div>
                              <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
                                Medication Line {index + 1}
                              </p>
                              {line.medicationItemId && (
                                <div className="mt-1 flex items-center gap-1.5">
                                  <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                    Verified from catalog
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          {lines.length > 1 && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => setLines((current) => current.filter((item) => item.id !== line.id))}
                              className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/20"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          <div className="relative md:col-span-2">
                            <div className="relative">
                              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                              <Input
                                placeholder="Search medication by name, DCI, or code..."
                                value={line.searchText}
                                onFocus={() => setActiveLineId(line.id)}
                                onBlur={() => {
                                  window.setTimeout(() => {
                                    setActiveLineId((current) => (current === line.id ? null : current));
                                  }, 200);
                                }}
                                onChange={(event) => {
                                  const value = event.target.value;
                                  updateLine(line.id, "searchText", value);
                                  updateLine(line.id, "medicationLabel", value);
                                  updateLine(line.id, "medicationItemId", undefined);
                                  updateLine(line.id, "unitPrice", undefined);
                                  setActiveLineId(line.id);
                                }}
                                className="pl-11"
                              />
                            </div>
                            <AnimatePresence>
                              {activeLineId === line.id && line.searchText.trim().length >= 2 && (
                                <motion.div
                                  initial={{ opacity: 0, y: -10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  transition={{ duration: 0.2 }}
                                  className="absolute z-30 mt-2 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200/80 bg-white/98 p-2 shadow-2xl backdrop-blur-sm dark:border-slate-700/80 dark:bg-slate-900/98"
                                >
                                  {medicationsQuery.isLoading ? (
                                    <div className="flex items-center justify-center py-4">
                                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
                                    </div>
                                  ) : (medicationsQuery.data ?? []).length > 0 ? (
                                    (medicationsQuery.data ?? []).map((item) => (
                                      <button
                                        key={item.id}
                                        type="button"
                                        className="group w-full rounded-lg px-3 py-2.5 text-left transition-all duration-200 hover:bg-gradient-to-r hover:from-sky-50 hover:to-cyan-50 dark:hover:from-sky-950/50 dark:hover:to-cyan-950/30"
                                        onMouseDown={(event) => {
                                          event.preventDefault();
                                          selectMedication(line.id, item);
                                        }}
                                      >
                                        <div className="flex items-start justify-between">
                                          <div className="flex-1">
                                            <p className="font-bold text-slate-900 dark:text-slate-100">
                                              {buildMedicationLabel(item)}
                                            </p>
                                            <div className="mt-1 flex flex-wrap items-center gap-2">
                                              {item.dciName && (
                                                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                                  DCI: {item.dciName}
                                                </span>
                                              )}
                                              {item.cnamCode && (
                                                <Badge variant="info" className="text-xs">
                                                  CNAM: {item.cnamCode}
                                                </Badge>
                                              )}
                                            </div>
                                          </div>
                                          {item.prices?.[0]?.unitPrice !== undefined && (
                                            <div className="ml-3 flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 dark:bg-emerald-950/30">
                                              <DollarSign className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                                              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                                                {Number(item.prices[0].unitPrice).toFixed(3)} TND
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      </button>
                                    ))
                                  ) : (
                                    <div className="flex flex-col items-center justify-center py-6 text-center">
                                      <Search className="mb-2 h-8 w-8 text-slate-400" />
                                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                        No medication found
                                      </p>
                                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                                        Import catalog from Admin first
                                      </p>
                                    </div>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                          <div>
                            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.05em] text-slate-600 dark:text-slate-400">
                              <Pill className="h-3 w-3" />
                              Dose
                            </label>
                            <Input
                              placeholder="e.g., 500mg"
                              value={line.dose}
                              onChange={(event) => updateLine(line.id, "dose", event.target.value)}
                            />
                          </div>
                          <div>
                            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.05em] text-slate-600 dark:text-slate-400">
                              <Clock className="h-3 w-3" />
                              Frequency
                            </label>
                            <Input
                              placeholder="e.g., 2x daily"
                              value={line.frequency}
                              onChange={(event) => updateLine(line.id, "frequency", event.target.value)}
                            />
                          </div>
                          <div>
                            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.05em] text-slate-600 dark:text-slate-400">
                              <Calendar className="h-3 w-3" />
                              Duration (days)
                            </label>
                            <Input
                              type="number"
                              placeholder="7"
                              value={line.durationDays}
                              onChange={(event) =>
                                updateLine(line.id, "durationDays", Number(event.target.value))
                              }
                            />
                          </div>
                          <div>
                            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.05em] text-slate-600 dark:text-slate-400">
                              <Pill className="h-3 w-3" />
                              Quantity
                            </label>
                            <Input
                              type="number"
                              placeholder="1"
                              value={line.quantity}
                              onChange={(event) => updateLine(line.id, "quantity", Number(event.target.value))}
                            />
                          </div>
                          <div>
                            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.05em] text-slate-600 dark:text-slate-400">
                              <DollarSign className="h-3 w-3" />
                              Unit Price
                            </label>
                            <Input
                              type="number"
                              step="0.001"
                              placeholder={
                                line.medicationItemId ? "Auto-filled from catalog" : "Enter price"
                              }
                              value={line.unitPrice ?? ""}
                              disabled={!!line.medicationItemId}
                              onChange={(event) =>
                                updateLine(line.id, "unitPrice", Number(event.target.value) || undefined)
                              }
                              className={line.medicationItemId ? "bg-emerald-50/50 dark:bg-emerald-950/20" : ""}
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.05em] text-slate-600 dark:text-slate-400">
                              <FileText className="h-3 w-3" />
                              Instructions
                            </label>
                            <Input
                              placeholder="Additional instructions for the patient..."
                              value={line.instructions ?? ""}
                              onChange={(event) => updateLine(line.id, "instructions", event.target.value)}
                            />
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </motion.div>

              <AnimatePresence>
                {interactionQuery.data && interactionQuery.data.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="rounded-xl border-2 border-amber-300/80 bg-gradient-to-br from-amber-50/90 to-orange-50/70 p-4 shadow-lg dark:border-amber-700/80 dark:from-amber-950/40 dark:to-orange-950/30"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 dark:bg-amber-500/30">
                        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="flex-1">
                        <p className="mb-2 font-bold text-amber-900 dark:text-amber-100">
                          Drug Interaction Warnings
                        </p>
                        <ul className="space-y-1.5">
                          {interactionQuery.data.map((item) => (
                            <li
                              key={item.id}
                              className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-200"
                            >
                              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-600 dark:bg-amber-400" />
                              <span>
                                <Badge
                                  variant={item.severity === "HIGH" ? "error" : "warning"}
                                  className="mr-2 text-xs"
                                >
                                  {item.severity}
                                </Badge>
                                {item.description}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.label
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="block"
              >
                <div className="mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                  <span className="text-sm font-bold uppercase tracking-[0.05em] text-slate-700 dark:text-slate-300">
                    Additional Notes
                  </span>
                </div>
                <textarea
                  name="notes"
                  placeholder="Add any additional notes or instructions..."
                  className="min-h-24 w-full rounded-xl border border-slate-300 bg-white/95 px-4 py-3 text-sm font-medium text-slate-900 shadow-sm transition-all duration-200 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/70 focus-visible:border-sky-400 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-100 dark:focus-visible:border-sky-600"
                />
              </motion.label>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex items-center justify-between rounded-xl border border-slate-200/60 bg-gradient-to-r from-slate-50/80 to-blue-50/50 p-4 dark:border-slate-800/60 dark:from-slate-900/50 dark:to-blue-950/30"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-md">
                    <Calculator className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
                      Estimated Total
                    </p>
                    <p className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-300">
                      {estimatedTotal.toFixed(3)} <span className="text-base">TND</span>
                    </p>
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="group min-w-[180px]"
                >
                  {createMutation.isPending ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4 transition-transform group-hover:scale-110" />
                      Save Prescription
                    </>
                  )}
                </Button>
              </motion.div>
            </motion.form>
          </Modal>
        }
      >
        <DataTable
          data={prescriptionsQuery.data?.items ?? []}
          loading={prescriptionsQuery.isLoading}
          columns={[
            {
              key: "patient",
              header: "Patient",
              render: (row: any) => (
                <button
                  type="button"
                  className="group flex items-center gap-2 font-medium text-sky-600 transition-colors hover:text-sky-700 hover:underline dark:text-sky-400 dark:hover:text-sky-300"
                  onClick={() => navigate(`/app/patients/${row.patient.id}`)}
                >
                  <User className="h-4 w-4 transition-transform group-hover:scale-110" />
                  <span>
                    {row.patient.lastName} {row.patient.firstName}
                  </span>
                </button>
              )
            },
            {
              key: "doctor",
              header: "Doctor",
              render: (row: any) => (
                <div className="flex items-center gap-2">
                  <UserCircle className="h-4 w-4 text-slate-400" />
                  <span className="font-medium">
                    {row.doctor.lastName} {row.doctor.firstName}
                  </span>
                </div>
              )
            },
            {
              key: "lines",
              header: "Medications",
              render: (row: any) => (
                <Badge variant="medical" className="gap-1.5">
                  <Pill className="h-3 w-3" />
                  {row.lines.length} {row.lines.length === 1 ? "medication" : "medications"}
                </Badge>
              )
            },
            {
              key: "estimatedTotal",
              header: "Total Cost",
              render: (row: any) => (
                <div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-300">
                  <DollarSign className="h-4 w-4" />
                  <span>{Number(row.estimatedTotal).toFixed(3)} TND</span>
                </div>
              )
            },
            {
              key: "actions",
              header: "Actions",
              render: (row: any) => (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    api.post(`/prescriptions/${row.id}/pdf`).then(() => {
                      toast.success("Prescription PDF generated");
                    });
                  }}
                  className="group"
                >
                  <FileDown className="mr-1.5 h-4 w-4 transition-transform group-hover:-translate-y-0.5" />
                  Export PDF
                </Button>
              )
            }
          ]}
          empty={
            <EmptyState
              icon={Pill}
              title="No Prescriptions Found"
              description="Create your first prescription to get started with medication management."
            />
          }
        />
      </PageSection>
    </div>
  );
}

function buildMedicationLabel(item: {
  brandName: string;
  strength?: string;
  dosageForm?: string;
}): string {
  const parts = [item.brandName, item.strength, item.dosageForm].filter(Boolean);
  return parts.join(" ");
}
