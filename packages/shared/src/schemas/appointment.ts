import { z } from "zod";

export const appointmentSchema = z.object({
  patientId: z.string().uuid(),
  doctorId: z.string().uuid(),
  startAt: z.string(),
  endAt: z.string(),
  status: z.enum([
    "SCHEDULED",
    "ARRIVED",
    "IN_WAITING",
    "IN_CONSULTATION",
    "DONE",
    "CANCELED",
    "NO_SHOW"
  ]),
  reason: z.string().optional(),
  notes: z.string().optional()
});
