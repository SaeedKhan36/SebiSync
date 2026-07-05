import { z } from "zod";
import { evidenceTypeSchema } from "./enums";

export const evidenceUploadRequestSchema = z.object({
  checklistItemId: z.string(),
  clientId: z.string().optional(),
  fileName: z.string(),
  contentType: z.string(),
});
export type EvidenceUploadRequest = z.infer<typeof evidenceUploadRequestSchema>;

export const evidenceConfirmSchema = z.object({
  checklistItemId: z.string(),
  r2ObjectKey: z.string(),
  evidenceType: evidenceTypeSchema,
  description: z.string().optional(),
  submittedByUserId: z.string(),
  validUntil: z.coerce.date().optional(),
});
export type EvidenceConfirm = z.infer<typeof evidenceConfirmSchema>;

export const evidenceDtoSchema = z.object({
  id: z.string(),
  checklistItemId: z.string(),
  clientId: z.string().nullable(),
  evidenceType: z.string(),
  r2ObjectKey: z.string().nullable(),
  description: z.string().nullable(),
  submittedByUserId: z.string(),
  submittedAt: z.coerce.date(),
  validUntil: z.coerce.date().nullable(),
});
export type EvidenceDto = z.infer<typeof evidenceDtoSchema>;
