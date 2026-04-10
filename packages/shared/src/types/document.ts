import type { TenantScoped } from "./core";

export type DocumentTemplateType =
  | "MEDICAL_CERTIFICATE"
  | "SICK_LEAVE"
  | "SCHOOL_CERTIFICATE"
  | "FITNESS_CERTIFICATE"
  | "REFERRAL"
  | "IMAGING_REQUEST"
  | "LAB_REQUEST"
  | "INVOICE"
  | "RECEIPT"
  | "CNAM_GENERIC";

export interface DocumentTemplate extends TenantScoped {
  name: string;
  type: DocumentTemplateType;
  language: "FR" | "AR" | "BILINGUAL";
  body: string;
  isGlobal: boolean;
}

export interface GeneratedDocument extends TenantScoped {
  patientId: string;
  doctorId: string;
  templateId: string;
  fileUrl: string;
  payload: Record<string, unknown>;
}
