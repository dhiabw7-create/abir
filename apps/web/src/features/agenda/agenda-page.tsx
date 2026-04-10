import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Badge,
  Button,
  Card,
  CardContent,
  DataTable,
  EmptyState,
  Input,
  Modal,
  StatCard
} from "@medflow/ui";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List as ListIcon,
  PlusCircle
} from "lucide-react";
import { api } from "@/lib/api";
import { PageSection } from "@/components/page-section";
import { useAuth } from "@/features/auth/auth-context";
import { toast } from "sonner";

const views = ["day", "week", "month", "list"] as const;
type ViewType = (typeof views)[number];
const API_MAX_PAGE_SIZE = 100;

interface AppointmentItem {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
  reason?: string | null;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
  };
  doctor: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface AppointmentsResponse {
  items: AppointmentItem[];
  total: number;
}

const statusOptions = [
  "ALL",
  "SCHEDULED",
  "ARRIVED",
  "IN_WAITING",
  "IN_CONSULTATION",
  "DONE",
  "CANCELED",
  "NO_SHOW"
] as const;

const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function AgendaPage(): JSX.Element {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [view, setView] = useState<ViewType>("week");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [statusFilter, setStatusFilter] = useState<(typeof statusOptions)[number]>("ALL");
  const [selectedDoctorId, setSelectedDoctorId] = useState("ALL");

  const canCreateAppointments = user?.role === "SUPER_ADMIN" || user?.role === "SECRETARY";
  const isDoctorView = user?.role === "DOCTOR";
  const effectiveDoctorId = isDoctorView ? user?.id : selectedDoctorId !== "ALL" ? selectedDoctorId : undefined;

  const range = useMemo(() => getRange(view, date), [date, view]);
  const weekDays = useMemo(() => getWeekDays(date), [date]);
  const monthCells = useMemo(() => getMonthCells(date), [date]);
  const rangeLabel = useMemo(() => getRangeLabel(view, date), [date, view]);

  const appointmentsQuery = useQuery({
    queryKey: ["appointments", date, view, effectiveDoctorId],
    queryFn: async () => {
      const response = await api.get<AppointmentsResponse>("/appointments", {
        params: {
          from: range.from,
          to: range.to,
          pageSize: API_MAX_PAGE_SIZE,
          doctorId: effectiveDoctorId
        }
      });
      return response.data;
    }
  });

  const patientsQuery = useQuery({
    queryKey: ["agenda-patients"],
    queryFn: async () => {
      const response = await api.get("/patients", { params: { pageSize: API_MAX_PAGE_SIZE } });
      return response.data.items as Array<{ id: string; firstName: string; lastName: string }>;
    }
  });

  const doctorsQuery = useQuery({
    queryKey: ["agenda-doctors"],
    queryFn: async () => {
      const response = await api.get("/users");
      return (response.data as Array<{ id: string; firstName: string; lastName: string; role: { name: string } }>).filter(
        (row) => row.role.name === "DOCTOR"
      );
    }
  });

  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const response = await api.post("/appointments", payload);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Appointment created");
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: () => toast.error("Failed to create appointment")
  });

  const setStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await api.patch(`/appointments/${id}/status/${status}`);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Appointment status updated");
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: () => toast.error("Failed to update status")
  });

  const allAppointments = appointmentsQuery.data?.items ?? [];
  const appointments = useMemo(
    () =>
      allAppointments
        .filter((item) => (statusFilter === "ALL" ? true : item.status === statusFilter))
        .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()),
    [allAppointments, statusFilter]
  );

  const stats = useMemo(() => {
    const now = new Date();
    const todayCount = appointments.filter((item) => isSameDay(new Date(item.startAt), now)).length;
    const inProgress = appointments.filter((item) =>
      ["ARRIVED", "IN_WAITING", "IN_CONSULTATION"].includes(item.status)
    ).length;
    const done = appointments.filter((item) => item.status === "DONE").length;
    return { total: appointments.length, today: todayCount, inProgress, done };
  }, [appointments]);

  return (
    <div className="space-y-6">
      <PageSection
        title="Agenda"
        description={isDoctorView ? "Doctor planning board and patient flow." : "Real calendar workflow for appointments."}
        action={
          canCreateAppointments ? (
            <Modal
              trigger={
                <Button className="inline-flex items-center gap-2">
                  <PlusCircle className="h-4 w-4" />
                  New Appointment
                </Button>
              }
              title="Create Appointment"
              description="Schedule patient appointment with doctor."
            >
              <form
                className="grid grid-cols-1 gap-3 md:grid-cols-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  const formData = new FormData(event.currentTarget);
                  createMutation.mutate({
                    patientId: String(formData.get("patientId")),
                    doctorId: String(formData.get("doctorId")),
                    startAt: new Date(String(formData.get("startAt"))).toISOString(),
                    endAt: new Date(String(formData.get("endAt"))).toISOString(),
                    status: "SCHEDULED",
                    reason: String(formData.get("reason") || "")
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
                <label>
                  <span className="mb-1 block text-sm font-medium">Start</span>
                  <Input type="datetime-local" name="startAt" required />
                </label>
                <label>
                  <span className="mb-1 block text-sm font-medium">End</span>
                  <Input type="datetime-local" name="endAt" required />
                </label>
                <label className="md:col-span-2">
                  <span className="mb-1 block text-sm font-medium">Reason</span>
                  <Input type="text" name="reason" />
                </label>
                <div className="md:col-span-2 flex justify-end">
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Saving..." : "Create"}
                  </Button>
                </div>
              </form>
            </Modal>
          ) : null
        }
      >
        <Card className="border-0 bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 text-white shadow-lg">
          <CardContent className="space-y-4 p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm text-white/80">Current range</p>
                <p className="text-xl font-semibold">{rangeLabel}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="icon" variant="secondary" className="bg-white/20 text-white hover:bg-white/30" onClick={() => setDate(shiftDate(date, view, -1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="secondary" className="bg-white/20 text-white hover:bg-white/30" onClick={() => setDate(new Date().toISOString().slice(0, 10))}>
                  Today
                </Button>
                <Button size="icon" variant="secondary" className="bg-white/20 text-white hover:bg-white/30" onClick={() => setDate(shiftDate(date, view, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2">
                <Button variant={view === "day" ? "default" : "secondary"} onClick={() => setView("day")} className={view === "day" ? "bg-white text-sky-700" : "bg-white/20 text-white"}>Day</Button>
                <Button variant={view === "week" ? "default" : "secondary"} onClick={() => setView("week")} className={view === "week" ? "bg-white text-sky-700" : "bg-white/20 text-white"}>
                  <CalendarDays className="mr-1 h-4 w-4" />
                  Week
                </Button>
                <Button variant={view === "month" ? "default" : "secondary"} onClick={() => setView("month")} className={view === "month" ? "bg-white text-sky-700" : "bg-white/20 text-white"}>
                  <LayoutGrid className="mr-1 h-4 w-4" />
                  Month
                </Button>
                <Button variant={view === "list" ? "default" : "secondary"} onClick={() => setView("list")} className={view === "list" ? "bg-white text-sky-700" : "bg-white/20 text-white"}>
                  <ListIcon className="mr-1 h-4 w-4" />
                  List
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="w-auto min-w-40 border-white/60 bg-white/90 text-slate-900" />
                {!isDoctorView ? (
                  <select value={selectedDoctorId} onChange={(event) => setSelectedDoctorId(event.target.value)} className="h-10 min-w-44 rounded-xl border border-white/60 bg-white/90 px-3 text-sm text-slate-900">
                    <option value="ALL">All doctors</option>
                    {(doctorsQuery.data ?? []).map((doctor) => (
                      <option key={doctor.id} value={doctor.id}>
                        Dr {doctor.lastName} {doctor.firstName}
                      </option>
                    ))}
                  </select>
                ) : null}
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as (typeof statusOptions)[number])} className="h-10 min-w-44 rounded-xl border border-white/60 bg-white/90 px-3 text-sm text-slate-900">
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Appointments" value={String(stats.total)} />
          <StatCard title="Today" value={String(stats.today)} />
          <StatCard title="In Progress" value={String(stats.inProgress)} />
          <StatCard title="Completed" value={String(stats.done)} />
        </div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} key={`${view}-${date}-${statusFilter}-${effectiveDoctorId ?? "all"}`}>
          {appointmentsQuery.isLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div key={idx} className="h-14 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
                ))}
              </div>
            </div>
          ) : appointments.length === 0 ? (
            <EmptyState title="No appointments" description="No data for selected view and filters." />
          ) : view === "week" ? (
            <WeekView appointments={appointments} weekDays={weekDays} onOpenPatient={(id) => navigate(`/app/patients/${id}`)} onStatusChange={(id, status) => setStatusMutation.mutate({ id, status })} statusPending={setStatusMutation.isPending} />
          ) : view === "month" ? (
            <MonthView appointments={appointments} cells={monthCells} onOpenPatient={(id) => navigate(`/app/patients/${id}`)} />
          ) : (
            <DataTable
              data={appointments}
              columns={[
                {
                  key: "patient",
                  header: "Patient",
                  render: (row: AppointmentItem) => (
                    <button type="button" className="text-sky-600 hover:underline" onClick={() => navigate(`/app/patients/${row.patient.id}`)}>
                      {row.patient.lastName} {row.patient.firstName}
                    </button>
                  )
                },
                { key: "doctor", header: "Doctor", render: (row: AppointmentItem) => `${row.doctor.lastName} ${row.doctor.firstName}` },
                { key: "start", header: "Start", render: (row: AppointmentItem) => formatDateTime(row.startAt) },
                { key: "status", header: "Status", render: (row: AppointmentItem) => <StatusBadge status={row.status} /> },
                {
                  key: "actions",
                  header: "Actions",
                  render: (row: AppointmentItem) => (
                    <StatusActions appointment={row} onStatusChange={(status) => setStatusMutation.mutate({ id: row.id, status })} disabled={setStatusMutation.isPending} />
                  )
                }
              ]}
            />
          )}
        </motion.div>
      </PageSection>
    </div>
  );
}

function WeekView({
  appointments,
  weekDays,
  onOpenPatient,
  onStatusChange,
  statusPending
}: {
  appointments: AppointmentItem[];
  weekDays: Date[];
  onOpenPatient: (patientId: string) => void;
  onStatusChange: (id: string, status: string) => void;
  statusPending: boolean;
}): JSX.Element {
  return (
    <div className="grid grid-cols-1 gap-3 xl:grid-cols-7">
      {weekDays.map((day, index) => {
        const dayItems = appointments.filter((item) => isSameDay(new Date(item.startAt), day));
        return (
          <Card key={day.toISOString()}>
            <CardContent className="p-3">
              <div className="mb-2 border-b border-slate-200 pb-2 dark:border-slate-800">
                <p className="text-xs uppercase tracking-wide text-slate-500">{dayNames[index]}</p>
                <div className="flex items-center justify-between">
                  <p className="text-lg font-semibold">{day.getDate()}</p>
                  <Badge>{dayItems.length}</Badge>
                </div>
              </div>
              <div className="space-y-2">
                {dayItems.length === 0 ? <p className="text-xs text-slate-400">No appointments</p> : null}
                {dayItems.map((item) => (
                  <div key={item.id} className="rounded-lg border border-slate-200 p-2 text-xs dark:border-slate-700">
                    <div className="mb-1 flex items-center justify-between">
                      <p className="font-medium text-slate-700 dark:text-slate-200">{formatTime(item.startAt)}</p>
                      <StatusBadge status={item.status} compact />
                    </div>
                    <button type="button" className="text-sky-600 hover:underline" onClick={() => onOpenPatient(item.patient.id)}>
                      {item.patient.lastName} {item.patient.firstName}
                    </button>
                    <div className="mt-2">
                      <StatusActions appointment={item} disabled={statusPending} compact onStatusChange={(status) => onStatusChange(item.id, status)} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function MonthView({
  appointments,
  cells,
  onOpenPatient
}: {
  appointments: AppointmentItem[];
  cells: Array<{ date: Date; inMonth: boolean }>;
  onOpenPatient: (patientId: string) => void;
}): JSX.Element {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-xs font-medium uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-800/30">
        {dayNames.map((name) => (
          <div key={name} className="p-2 text-center">{name}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((cell) => {
          const dayItems = appointments.filter((item) => isSameDay(new Date(item.startAt), cell.date));
          const shown = dayItems.slice(0, 3);
          return (
            <div key={cell.date.toISOString()} className={`min-h-32 border-b border-r border-slate-100 p-2 dark:border-slate-800 ${cell.inMonth ? "" : "bg-slate-50/70 dark:bg-slate-900/40"}`}>
              <p className={`mb-2 text-right text-xs ${cell.inMonth ? "text-slate-600 dark:text-slate-300" : "text-slate-400"}`}>{cell.date.getDate()}</p>
              <div className="space-y-1">
                {shown.map((item) => (
                  <button key={item.id} type="button" className="block w-full rounded-md bg-sky-50 px-1.5 py-1 text-left text-[11px] text-sky-700 hover:bg-sky-100 dark:bg-sky-950/40 dark:text-sky-300" onClick={() => onOpenPatient(item.patient.id)}>
                    {formatTime(item.startAt)} {item.patient.lastName}
                  </button>
                ))}
                {dayItems.length > shown.length ? <p className="text-[11px] text-slate-500">+{dayItems.length - shown.length} more</p> : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatusActions({
  appointment,
  onStatusChange,
  disabled,
  compact = false
}: {
  appointment: AppointmentItem;
  onStatusChange: (status: string) => void;
  disabled: boolean;
  compact?: boolean;
}): JSX.Element {
  if (["DONE", "CANCELED", "NO_SHOW"].includes(appointment.status)) {
    return <span className="text-xs text-slate-500">Closed</span>;
  }
  const cls = compact ? "px-2 py-1 text-[11px]" : "";
  return (
    <div className="flex flex-wrap gap-1">
      <Button size="sm" variant="secondary" className={cls} disabled={disabled} onClick={() => onStatusChange("ARRIVED")}>Arrived</Button>
      <Button size="sm" variant="outline" className={cls} disabled={disabled} onClick={() => onStatusChange("IN_CONSULTATION")}>In Consult</Button>
      <Button size="sm" className={cls} disabled={disabled} onClick={() => onStatusChange("DONE")}>Done</Button>
    </div>
  );
}

function StatusBadge({ status, compact = false }: { status: string; compact?: boolean }): JSX.Element {
  const palette: Record<string, string> = {
    SCHEDULED: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
    ARRIVED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    IN_WAITING: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    IN_CONSULTATION: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300",
    DONE: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    CANCELED: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
    NO_SHOW: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
  };
  return <Badge className={`${palette[status] ?? ""} ${compact ? "px-2 py-0.5 text-[10px]" : ""}`}>{status}</Badge>;
}

function getRange(view: ViewType, date: string): { from: string; to: string } {
  const target = parseDate(date);
  const from = new Date(target);
  const to = new Date(target);
  if (view === "day") {
    from.setHours(0, 0, 0, 0);
    to.setHours(23, 59, 59, 999);
  } else if (view === "week") {
    const monday = getMonday(target);
    from.setTime(monday.getTime());
    to.setTime(monday.getTime());
    to.setDate(to.getDate() + 6);
    to.setHours(23, 59, 59, 999);
  } else {
    from.setDate(1);
    from.setHours(0, 0, 0, 0);
    to.setMonth(target.getMonth() + 1, 0);
    to.setHours(23, 59, 59, 999);
  }
  return { from: from.toISOString(), to: to.toISOString() };
}

function shiftDate(date: string, view: ViewType, dir: 1 | -1): string {
  const target = parseDate(date);
  if (view === "day") {
    target.setDate(target.getDate() + dir);
  } else if (view === "week") {
    target.setDate(target.getDate() + dir * 7);
  } else {
    target.setMonth(target.getMonth() + dir);
  }
  return target.toISOString().slice(0, 10);
}

function getWeekDays(date: string): Date[] {
  const monday = getMonday(parseDate(date));
  return Array.from({ length: 7 }).map((_, idx) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + idx);
    return day;
  });
}

function getMonthCells(date: string): Array<{ date: Date; inMonth: boolean }> {
  const target = parseDate(date);
  const monthStart = new Date(target.getFullYear(), target.getMonth(), 1);
  const monthEnd = new Date(target.getFullYear(), target.getMonth() + 1, 0);
  const gridStart = getMonday(monthStart);
  return Array.from({ length: 42 }).map((_, idx) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + idx);
    return {
      date: day,
      inMonth: day >= monthStart && day <= monthEnd
    };
  });
}

function getRangeLabel(view: ViewType, date: string): string {
  const target = parseDate(date);
  if (view === "day") {
    return target.toLocaleDateString("fr-TN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }
  if (view === "week") {
    const monday = getMonday(target);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return `${monday.toLocaleDateString("fr-TN", { day: "2-digit", month: "short" })} - ${sunday.toLocaleDateString("fr-TN", { day: "2-digit", month: "short", year: "numeric" })}`;
  }
  return target.toLocaleDateString("fr-TN", { month: "long", year: "numeric" });
}

function getMonday(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function parseDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1, 12, 0, 0, 0);
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString("fr-TN", { hour: "2-digit", minute: "2-digit" });
}

function formatDateTime(value: string): string {
  const d = new Date(value);
  return `${d.toLocaleDateString("fr-TN")} ${d.toLocaleTimeString("fr-TN", { hour: "2-digit", minute: "2-digit" })}`;
}
