import { z } from "zod";

export const prescriptionLineSchema = z.object({
  medicationItemId: z.string().uuid().optional(),
  medicationLabel: z.string().min(2),
  dose: z.string().min(1),
  frequency: z.string().min(1),
  durationDays: z.number().int().positive(),
  instructions: z.string().optional(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().optional()
});

export const prescriptionSchema = z.object({
  patientId: z.string().uuid(),
  doctorId: z.string().uuid(),
  consultationId: z.string().uuid().optional(),
  notes: z.string().optional(),
  lines: z.array(prescriptionLineSchema).min(1)
});
