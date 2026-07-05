import { z } from "zod";
import { gapSeveritySchema, gapTypeSchema } from "./enums";

export const gapDtoSchema = z.object({
  id: z.string(),
  checklistItemId: z.string(),
  gapType: gapTypeSchema,
  severity: gapSeveritySchema,
  detectedAt: z.coerce.date(),
  resolvedAt: z.coerce.date().nullable(),
  resolutionNote: z.string().nullable(),
  checklistItem: z.object({
    id: z.string(),
    obligation: z.object({ code: z.string(), title: z.string() }),
    client: z.object({ id: z.string(), name: z.string() }).nullable(),
  }),
});
export type GapDto = z.infer<typeof gapDtoSchema>;

export const resolveGapSchema = z.object({
  gapId: z.string(),
  resolutionNote: z.string(),
  resolvedByUserId: z.string(),
});
export type ResolveGap = z.infer<typeof resolveGapSchema>;
