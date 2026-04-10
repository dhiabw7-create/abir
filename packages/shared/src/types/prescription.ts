import type { TenantScoped } from "./core";

export interface Prescription extends TenantScoped {
  patientId: string;
  doctorId: string;
  consultationId?: string | null;
  estimatedTotal: number;
  notes?: string | null;
}

export interface PrescriptionLine {
  id: string;
  prescriptionId: string;
  medicationItemId?: string | null;
  medicationLabel: string;
  dose: string;
  frequency: string;
  durationDays: number;
  instructions?: string | null;
  unitPrice?: number | null;
  quantity: number;
  lineTotal?: number | null;
}

export interface MedicationItem {
  id: string;
  tenantId?: string | null;
  catalogVersion: string;
  source: string;
  code: string;
  brandName: string;
  dciName?: string | null;
  dosageForm?: string | null;
  strength?: string | null;
  familyClass?: string | null;
  reimbursable: boolean;
  cnamCode?: string | null;
  unitPrice?: number | null;
}
