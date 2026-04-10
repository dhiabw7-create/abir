import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@medflow/ui";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useTheme } from "@/lib/theme-context";
import { useI18n } from "@/lib/i18n-context";
import { useAuth } from "@/features/auth/auth-context";

interface WorkingHourDraft {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

export function SettingsPage(): JSX.Element {
  const queryClient = useQueryClient();
  const { setTheme } = useTheme();
  const { language, setLanguage } = useI18n();
  const { user } = useAuth();

  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const canManageTenantSettings = isSuperAdmin;
  const canManageWorkingHours = user?.role === "SUPER_ADMIN" || user?.role === "DOCTOR";

  const [hours, setHours] = useState<WorkingHourDraft[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");

  useEffect(() => {
    if (user?.role === "DOCTOR") {
      setSelectedDoctorId(user.id);
    }
  }, [user?.id, user?.role]);

  const settingsQuery = useQuery({
    queryKey: ["settings-tenant"],
    queryFn: async () => {
      const response = await api.get("/settings/tenant");
      return response.data as any;
    }
  });

  const doctorsQuery = useQuery({
    queryKey: ["settings-doctors"],
    enabled: isSuperAdmin,
    queryFn: async () => {
      const response = await api.get("/users");
      return (response.data as any[]).filter((item) => item.role.name === "DOCTOR");
    }
  });

  useEffect(() => {
    if (isSuperAdmin && !selectedDoctorId && doctorsQuery.data?.[0]?.id) {
      setSelectedDoctorId(doctorsQuery.data[0].id);
    }
  }, [doctorsQuery.data, isSuperAdmin, selectedDoctorId]);

  const targetDoctorId = useMemo(() => {
    if (user?.role === "DOCTOR") {
      return user.id;
    }
    return selectedDoctorId || undefined;
  }, [selectedDoctorId, user?.id, user?.role]);

  const workingHoursQuery = useQuery({
    queryKey: ["settings-working-hours", targetDoctorId],
    queryFn: async () => {
      const response = await api.get("/settings/working-hours", {
        params: { doctorId: targetDoctorId }
      });
      return response.data as any[];
    }
  });

  useEffect(() => {
    if (workingHoursQuery.data) {
      setHours(
        workingHoursQuery.data.map((item) => ({
          dayOfWeek: item.dayOfWeek,
          startTime: item.startTime,
          endTime: item.endTime,
          isActive: item.isActive
        }))
      );
    }
  }, [workingHoursQuery.data]);

  const updateSettings = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const response = await api.patch("/settings/tenant", payload);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Settings updated");
      queryClient.invalidateQueries({ queryKey: ["settings-tenant"] });
    },
    onError: () => {
      toast.error("You are not allowed to update tenant settings.");
    }
  });

  const updateHours = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const response = await api.post("/settings/working-hours", payload);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Working hours updated");
      queryClient.invalidateQueries({ queryKey: ["settings-working-hours"] });
    },
    onError: () => {
      toast.error("Unable to update working hours.");
    }
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Tenant Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid grid-cols-1 gap-3 md:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!canManageTenantSettings) {
                toast.error("Only super admin can edit tenant settings.");
                return;
              }

              const formData = new FormData(event.currentTarget);
              updateSettings.mutate({
                clinicName: String(formData.get("clinicName")),
                clinicAddress: String(formData.get("clinicAddress") || ""),
                clinicPhone: String(formData.get("clinicPhone") || ""),
                logoPath: String(formData.get("logoPath") || ""),
                stampPath: String(formData.get("stampPath") || ""),
                signaturePath: String(formData.get("signaturePath") || ""),
                documentFooter: String(formData.get("documentFooter") || ""),
                language
              });
            }}
          >
            <Field
              name="clinicName"
              label="Clinic Name"
              defaultValue={settingsQuery.data?.clinicName}
              disabled={!canManageTenantSettings}
            />
            <Field
              name="clinicPhone"
              label="Clinic Phone"
              defaultValue={settingsQuery.data?.clinicPhone}
              disabled={!canManageTenantSettings}
            />
            <Field
              name="clinicAddress"
              label="Clinic Address"
              className="md:col-span-2"
              defaultValue={settingsQuery.data?.clinicAddress}
              disabled={!canManageTenantSettings}
            />
            <Field
              name="logoPath"
              label="Logo Path"
              defaultValue={settingsQuery.data?.logoPath}
              disabled={!canManageTenantSettings}
            />
            <Field
              name="stampPath"
              label="Stamp Path"
              defaultValue={settingsQuery.data?.stampPath}
              disabled={!canManageTenantSettings}
            />
            <Field
              name="signaturePath"
              label="Signature Path"
              defaultValue={settingsQuery.data?.signaturePath}
              disabled={!canManageTenantSettings}
            />
            <Field
              name="documentFooter"
              label="Document Footer"
              className="md:col-span-2"
              defaultValue={settingsQuery.data?.documentFooter}
              disabled={!canManageTenantSettings}
            />
            <div className="md:col-span-2 flex items-center gap-3">
              <Button type="button" variant="outline" onClick={() => setTheme("light")}>
                Light Mode
              </Button>
              <Button type="button" variant="outline" onClick={() => setTheme("dark")}>
                Dark Mode
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setLanguage(language === "fr" ? "ar" : "fr")}
              >
                Toggle FR/AR
              </Button>
              {canManageTenantSettings ? (
                <Button type="submit" disabled={updateSettings.isPending}>
                  Save Settings
                </Button>
              ) : (
                <p className="text-sm text-slate-500">Read-only for your role.</p>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Doctor Working Hours</CardTitle>
        </CardHeader>
        <CardContent>
          {!canManageWorkingHours ? (
            <div className="space-y-2">
              <p className="text-sm text-slate-500">
                Read-only view. Working hours are managed by doctor or super admin.
              </p>
              {(workingHoursQuery.data ?? []).map((hour) => (
                <div
                  key={`${hour.doctorId}-${hour.dayOfWeek}-${hour.startTime}-${hour.endTime}`}
                  className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800"
                >
                  Day {hour.dayOfWeek} - {hour.startTime} to {hour.endTime} ({hour.isActive ? "Active" : "Off"})
                </div>
              ))}
            </div>
          ) : (
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                if (!targetDoctorId) {
                  toast.error("No doctor selected");
                  return;
                }

                updateHours.mutate({
                  doctorId: targetDoctorId,
                  items: hours
                });
              }}
            >
              {isSuperAdmin ? (
                <label className="block">
                  <span className="mb-1 block text-sm font-medium">Doctor</span>
                  <select
                    className="w-full rounded-xl border border-slate-300 bg-transparent p-2"
                    value={selectedDoctorId}
                    onChange={(event) => setSelectedDoctorId(event.target.value)}
                  >
                    <option value="">Select doctor</option>
                    {(doctorsQuery.data ?? []).map((doctor) => (
                      <option key={doctor.id} value={doctor.id}>
                        {doctor.lastName} {doctor.firstName}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <div className="space-y-2">
                {hours.map((hour, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 p-3 md:grid-cols-5 dark:border-slate-800"
                  >
                    <Input
                      type="number"
                      min={0}
                      max={6}
                      value={hour.dayOfWeek}
                      onChange={(event) => {
                        const next = [...hours];
                        next[index].dayOfWeek = Number(event.target.value);
                        setHours(next);
                      }}
                    />
                    <Input
                      value={hour.startTime}
                      onChange={(event) => {
                        const next = [...hours];
                        next[index].startTime = event.target.value;
                        setHours(next);
                      }}
                    />
                    <Input
                      value={hour.endTime}
                      onChange={(event) => {
                        const next = [...hours];
                        next[index].endTime = event.target.value;
                        setHours(next);
                      }}
                    />
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={hour.isActive}
                        onChange={(event) => {
                          const next = [...hours];
                          next[index].isActive = event.target.checked;
                          setHours(next);
                        }}
                      />
                      Active
                    </label>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setHours((current) =>
                          current.filter((_, itemIndex) => itemIndex !== index)
                        )
                      }
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    setHours((current) => [
                      ...current,
                      {
                        dayOfWeek: 1,
                        startTime: "08:00",
                        endTime: "12:00",
                        isActive: true
                      }
                    ])
                  }
                >
                  Add Slot
                </Button>
                <Button type="submit" disabled={updateHours.isPending}>
                  Save Hours
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  name,
  label,
  defaultValue,
  className,
  disabled
}: {
  name: string;
  label: string;
  defaultValue?: string;
  className?: string;
  disabled?: boolean;
}): JSX.Element {
  return (
    <label className={className}>
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <Input name={name} defaultValue={defaultValue} disabled={disabled} />
    </label>
  );
}
