import { z } from "zod";

export const medicationImportRowSchema = z.object({
  code: z.string(),
  brandName: z.string(),
  dciName: z.string().optional(),
  dosageForm: z.string().optional(),
  strength: z.string().optional(),
  familyClass: z.string().optional(),
  reimbursable: z.boolean().default(false),
  cnamCode: z.string().optional(),
  unitPrice: z.number().optional()
});

export const medicationImportSchema = z.object({
  source: z.string().min(2),
  catalogVersion: z.string().min(1),
  rows: z.array(medicationImportRowSchema).min(1)
});
