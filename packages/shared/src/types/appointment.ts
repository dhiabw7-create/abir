import type { TenantScoped } from "./core";

export type AppointmentStatus =
  | "SCHEDULED"
  | "ARRIVED"
  | "IN_WAITING"
  | "IN_CONSULTATION"
  | "DONE"
  | "CANCELED"
  | "NO_SHOW";

export interface Appointment extends TenantScoped {
  patientId: string;
  doctorId: string;
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
  reason?: string | null;
  notes?: string | null;
}

export interface WaitingRoomEntry extends TenantScoped {
  patientId: string;
  appointmentId?: string | null;
  status: "WAITING" | "CALLED" | "PAUSED" | "DONE" | "SKIPPED";
  isUrgent: boolean;
  arrivedAt: string;
  calledAt?: string | null;
  completedAt?: string | null;
  priorityScore: number;
}
