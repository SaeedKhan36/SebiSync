import { z } from "zod";
import { evidenceTypeSchema } from "./enums";

export const evidenceUploadRequestSchema = z.object({
  checklistItemId: z.string(),
  clientId: z.string().optional(),
  fileName: z.string(),
  contentType: z.string(),
});
export type EvidenceUploadRequest = z.infer<typeof evidenceUploadRequestSchema>;

// submittedByUserId is intentionally not part of this input — it's resolved
// server-side from the authenticated Clerk session, never trusted from the
// client, so a caller can't attribute an upload to an arbitrary user.
export const evidenceConfirmSchema = z.object({
  checklistItemId: z.string(),
  r2ObjectKey: z.string(),
  evidenceType: evidenceTypeSchema,
  description: z.string().optional(),
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
