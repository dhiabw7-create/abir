import type { TenantScoped } from "./core";

export interface Patient extends TenantScoped {
  ficheNumber: string;
  cnamNumber?: string | null;
  nationalId?: string | null;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phone: string;
  address?: string | null;
  insuranceProvider?: string | null;
  insurancePolicyNumber?: string | null;
  medicalHistory?: string | null;
  allergies?: string[];
  chronicTreatments?: string[];
  lastVisitAt?: string | null;
}

export interface PatientCreateInput {
  ficheNumber: string;
  cnamNumber?: string;
  nationalId?: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phone: string;
  address?: string;
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  medicalHistory?: string;
  allergies?: string[];
  chronicTreatments?: string[];
}
