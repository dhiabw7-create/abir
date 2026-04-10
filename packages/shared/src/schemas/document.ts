import { z } from "zod";

export const documentTemplateSchema = z.object({
  name: z.string().min(2),
  type: z.enum([
    "MEDICAL_CERTIFICATE",
    "SICK_LEAVE",
    "SCHOOL_CERTIFICATE",
    "FITNESS_CERTIFICATE",
    "REFERRAL",
    "IMAGING_REQUEST",
    "LAB_REQUEST",
    "INVOICE",
    "RECEIPT",
    "CNAM_GENERIC"
  ]),
  language: z.enum(["FR", "AR", "BILINGUAL"]),
  body: z.string().min(5),
  isGlobal: z.boolean().default(false)
});

export const generateDocumentSchema = z.object({
  patientId: z.string().uuid(),
  templateId: z.string().uuid(),
  payload: z.record(z.any())
});
