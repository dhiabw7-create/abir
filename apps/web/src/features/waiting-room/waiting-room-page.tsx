import { useEffect, useMemo, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge, Button, DataTable, Modal } from "@medflow/ui";
import { api } from "@/lib/api";
import { PageSection } from "@/components/page-section";
import { useAuth } from "@/features/auth/auth-context";
import { toast } from "sonner";

interface WaitingEntry {
  id: string;
  status: string;
  isUrgent: boolean;
  arrivalTime: string;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
  };
  appointment?: {
    id: string;
    startAt: string;
  } | null;
}

export function WaitingRoomPage(): JSX.Element {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [leaveEntryId, setLeaveEntryId] = useState<string | null>(null);
  const canCallNext = user?.role === "SUPER_ADMIN" || user?.role === "DOCTOR";
  const canCheckIn = user?.role === "SUPER_ADMIN" || user?.role === "SECRETARY";

  const queueQuery = useQuery({
    queryKey: ["waiting-room"],
    queryFn: async () => {
      const response = await api.get<WaitingEntry[]>("/waiting-room");
      return response.data;
    }
  });

  const metricsQuery = useQuery({
    queryKey: ["waiting-room-metrics"],
    queryFn: async () => {
      const response = await api.get<{ waitingCount: number; averageWaitMinutes: number }>(
        "/waiting-room/metrics"
      );
      return response.data;
    }
  });

  const patientsQuery = useQuery({
    queryKey: ["waiting-room-patients"],
    queryFn: async () => {
      const response = await api.get("/patients", { params: { pageSize: 100 } });
      return response.data.items as Array<{ id: string; firstName: string; lastName: string }>;
    }
  });

  const appointmentsQuery = useQuery({
    queryKey: ["waiting-room-appointments"],
    queryFn: async () => {
      const response = await api.get("/appointments", {
        params: { from: new Date().toISOString(), pageSize: 100 }
      });
      return response.data.items as Array<{ id: string; patientId: string; startAt: string }>;
    }
  });

  useEffect(() => {
    const tenantId = localStorage.getItem("activeTenantId") ?? user?.tenantId;
    if (!tenantId) {
      return;
    }

    const nextSocket = io(`${import.meta.env.VITE_API_URL ?? "http://localhost:3000"}/waiting-room`, {
      withCredentials: true,
      auth: { tenantId }
    });

    nextSocket.emit("waiting-room:join", { tenantId });

    nextSocket.on("waiting-room:updated", () => {
      queryClient.invalidateQueries({ queryKey: ["waiting-room"] });
      queryClient.invalidateQueries({ queryKey: ["waiting-room-metrics"] });
    });

    setSocket(nextSocket);

    return () => {
      nextSocket.disconnect();
      setSocket(null);
    };
  }, [queryClient, user?.tenantId]);

  const checkInMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const response = await api.post("/waiting-room/check-in", payload);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Patient checked in");
      queryClient.invalidateQueries({ queryKey: ["waiting-room"] });
      queryClient.invalidateQueries({ queryKey: ["waiting-room-metrics"] });
    }
  });

  const callNextMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post("/waiting-room/call-next", {});
      return response.data;
    },
    onSuccess: () => {
      toast.success("Next patient called");
      queryClient.invalidateQueries({ queryKey: ["waiting-room"] });
    },
    onError: () => toast.error("No patient waiting")
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await api.patch(`/waiting-room/${id}/status`, { status });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["waiting-room"] });
      queryClient.invalidateQueries({ queryKey: ["waiting-room-metrics"] });
    }
  });

  const activeSocket = useMemo(() => socket, [socket]);

  return (
    <div className="space-y-6">
      <PageSection
        title="Waiting Room"
        description="Live queue with secretary check-in and doctor controls"
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => activeSocket?.emit("waiting-room:join", { tenantId: localStorage.getItem("activeTenantId") })}>
              Sync
            </Button>
            {canCallNext ? (
              <Button onClick={() => callNextMutation.mutate()}>
                Call Next
              </Button>
            ) : null}
          </div>
        }
      >
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <Metric label="Waiting" value={String(metricsQuery.data?.waitingCount ?? 0)} />
          <Metric
            label="Average Wait Today"
            value={`${metricsQuery.data?.averageWaitMinutes ?? 0} min`}
          />
        </div>

        {canCheckIn ? (
          <Modal
            trigger={<Button variant="outline">Check-in Patient</Button>}
            title="Check-in"
            description="Secretary can add patient to live queue"
          >
            <form
              className="grid grid-cols-1 gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);

                checkInMutation.mutate({
                  patientId: String(formData.get("patientId")),
                  appointmentId: String(formData.get("appointmentId") || "") || undefined,
                  isUrgent: String(formData.get("isUrgent") || "false") === "true"
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

              <label>
                <span className="mb-1 block text-sm font-medium">Appointment</span>
                <select name="appointmentId" className="w-full rounded-xl border border-slate-300 bg-transparent p-2">
                  <option value="">Without appointment</option>
                  {(appointmentsQuery.data ?? []).map((appointment) => (
                    <option key={appointment.id} value={appointment.id}>
                      {new Date(appointment.startAt).toLocaleString("fr-TN")}
                    </option>
                  ))}
                </select>
              </label>

              <label className="inline-flex items-center gap-2 text-sm">
                <input name="isUrgent" type="checkbox" value="true" />
                Urgent priority
              </label>

              <Button type="submit" disabled={checkInMutation.isPending}>
                {checkInMutation.isPending ? "Checking in..." : "Confirm"}
              </Button>
            </form>
          </Modal>
        ) : null}

        <div className="mt-4">
          <DataTable
            data={queueQuery.data ?? []}
            columns={[
              {
                key: "patient",
                header: "Patient",
                render: (row: WaitingEntry) => `${row.patient.lastName} ${row.patient.firstName}`
              },
              {
                key: "arrival",
                header: "Arrival",
                render: (row: WaitingEntry) =>
                  new Date(row.arrivalTime).toLocaleTimeString("fr-TN")
              },
              {
                key: "priority",
                header: "Priority",
                render: (row: WaitingEntry) =>
                  row.isUrgent ? (
                    <Badge className="bg-red-100 text-red-700">URGENT</Badge>
                  ) : (
                    <Badge>Normal</Badge>
                  )
              },
              {
                key: "status",
                header: "Status",
                render: (row: WaitingEntry) => <Badge>{row.status}</Badge>
              },
              {
                key: "actions",
                header: "Actions",
                render: (row: WaitingEntry) => (
                  <div className="flex gap-1">
                    {canCallNext ? (
                      <>
                        <Button size="sm" variant="secondary" onClick={() => updateStatus.mutate({ id: row.id, status: "PAUSED" })}>
                          Pause
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: row.id, status: "SKIPPED" })}>
                          Skip
                        </Button>
                        <Button size="sm" onClick={() => updateStatus.mutate({ id: row.id, status: "DONE" })}>
                          Done
                        </Button>
                      </>
                    ) : null}
                    {canCheckIn ? (
                      <Button size="sm" variant="destructive" onClick={() => setLeaveEntryId(row.id)}>
                        Leave
                      </Button>
                    ) : null}
                  </div>
                )
              }
            ]}
          />
        </div>
      </PageSection>

      {leaveEntryId ? (
        <Modal
          trigger={<span />}
          open={Boolean(leaveEntryId)}
          onOpenChange={(open) => {
            if (!open) {
              setLeaveEntryId(null);
            }
          }}
          title="Leave Queue?"
          description="If you leave you lose your turn."
        >
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setLeaveEntryId(null)}>
              NO
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (leaveEntryId) {
                  api.patch(`/waiting-room/${leaveEntryId}/leave`).then(() => {
                    toast.success("Patient removed from queue");
                    queryClient.invalidateQueries({ queryKey: ["waiting-room"] });
                    setLeaveEntryId(null);
                  });
                }
              }}
            >
              YES
            </Button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}
