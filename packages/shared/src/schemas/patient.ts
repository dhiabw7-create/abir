import { z } from "zod";

export const patientSchema = z.object({
  ficheNumber: z.string().min(2),
  cnamNumber: z.string().optional(),
  nationalId: z.string().optional(),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  dateOfBirth: z.string(),
  phone: z.string().min(6),
  address: z.string().optional(),
  insuranceProvider: z.string().optional(),
  insurancePolicyNumber: z.string().optional(),
  medicalHistory: z.string().optional(),
  allergies: z.array(z.string()).optional(),
  chronicTreatments: z.array(z.string()).optional()
});

export const patientSearchSchema = z.object({
  q: z.string().optional(),
  ficheNumber: z.string().optional(),
  phone: z.string().optional(),
  cnamNumber: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  lastVisitFrom: z.string().optional(),
  lastVisitTo: z.string().optional()
});
