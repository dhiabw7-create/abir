import { z } from "zod";

export const consultationSchema = z.object({
  patientId: z.string().uuid(),
  doctorId: z.string().uuid(),
  appointmentId: z.string().uuid().optional(),
  symptoms: z.string().min(2),
  diagnosisCode: z.string().optional(),
  diagnosisLabel: z.string().optional(),
  notes: z.string().optional(),
  doctorPrivateNotes: z.string().optional(),
  weightKg: z.number().optional(),
  heightCm: z.number().optional(),
  bloodPressure: z.string().optional(),
  temperatureC: z.number().optional(),
  pulseBpm: z.number().optional()
});
