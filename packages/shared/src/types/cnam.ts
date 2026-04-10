import type { TenantScoped } from "./core";

export interface CNAMConsultationRecord extends TenantScoped {
  patientId: string;
  consultationId: string;
  cnamCode: string;
  eligible: boolean;
  amount: number;
  status: "PENDING" | "IN_BORDEREAU" | "EXPORTED" | "PAID" | "REJECTED";
}

export interface Bordereau extends TenantScoped {
  doctorId: string;
  reference: string;
  periodStart: string;
  periodEnd: string;
  status: "DRAFT" | "EXPORTED" | "ARCHIVED" | "CORRECTIVE";
  totalAmount: number;
}
