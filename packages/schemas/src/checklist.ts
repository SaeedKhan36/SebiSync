import { z } from "zod";
import { checklistStatusSchema } from "./enums";

export const checklistItemDtoSchema = z.object({
  id: z.string(),
  intermediaryId: z.string(),
  obligationId: z.string(),
  status: checklistStatusSchema,
  dueDate: z.coerce.date().nullable(),
  clientId: z.string().nullable(),
  assignedToUserId: z.string().nullable(),
  lastEvidenceAt: z.coerce.date().nullable(),
  obligation: z.object({
    code: z.string(),
    title: z.string(),
    citationText: z.string(),
    citationPage: z.number().nullable(),
    citationSection: z.string().nullable(),
    frequency: z.string().nullable(),
    deadlineDays: z.number().nullable(),
  }),
  client: z.object({ id: z.string(), name: z.string() }).nullable(),
});
export type ChecklistItemDto = z.infer<typeof checklistItemDtoSchema>;

// Creates a TriggerEvent + its ComplianceChecklistItem together for a PER_EVENT
// obligation (e.g. a SCORES complaint starting the 21-day clock).
// intermediaryId is intentionally not part of this input — it's resolved
// server-side from the authenticated Clerk organization, never trusted from
// the client, so a caller can't create events under another org.
export const createTriggerEventSchema = z.object({
  obligationId: z.string(),
  clientId: z.string().optional(),
  eventType: z.string(),
  eventDate: z.coerce.date(),
  referenceNo: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});
export type CreateTriggerEvent = z.infer<typeof createTriggerEventSchema>;

export const updateChecklistStatusSchema = z.object({
  id: z.string(),
  status: checklistStatusSchema,
  assignedToUserId: z.string().optional(),
});
export type UpdateChecklistStatus = z.infer<typeof updateChecklistStatusSchema>;

export const approveChecklistEvidenceSchema = z.object({
  id: z.string(),
});
export type ApproveChecklistEvidence = z.infer<typeof approveChecklistEvidenceSchema>;

export const rejectChecklistEvidenceSchema = z.object({
  id: z.string(),
  reason: z.string().min(1),
});
export type RejectChecklistEvidence = z.infer<typeof rejectChecklistEvidenceSchema>;
