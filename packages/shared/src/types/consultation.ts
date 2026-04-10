import type { TenantScoped } from "./core";

export interface Consultation extends TenantScoped {
  patientId: string;
  doctorId: string;
  appointmentId?: string | null;
  symptoms: string;
  diagnosisCode?: string | null;
  diagnosisLabel?: string | null;
  notes?: string | null;
  doctorPrivateNotes?: string | null;
  weightKg?: number | null;
  heightCm?: number | null;
  bloodPressure?: string | null;
  temperatureC?: number | null;
  pulseBpm?: number | null;
}
