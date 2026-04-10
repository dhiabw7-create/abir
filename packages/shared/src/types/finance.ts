import type { TenantScoped } from "./core";

export interface Payment extends TenantScoped {
  patientId: string;
  consultationId?: string | null;
  amount: number;
  method: "CASH" | "CARD" | "TRANSFER";
  paidAt: string;
  invoiceNumber?: string | null;
}

export interface RevenueKpi {
  today: number;
  month: number;
  year: number;
  consultationsCount: number;
  noShows: number;
}
