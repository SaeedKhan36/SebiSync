import { z } from "zod";
import { obligationFrequencySchema } from "./enums";

// What the LLM extraction agent must output per candidate obligation.
// citationText must be an exact verbatim substring of the source chunk text —
// enforced by the validateCitation graph node, not by this schema.
export const obligationCandidateSchema = z.object({
  code: z.string().min(3), // e.g. "IA-RISK-PROFILING-01"
  title: z.string(),
  description: z.string(),
  obligatedAction: z.string(),
  triggerEvent: z.string().nullable(),
  frequency: obligationFrequencySchema.nullable(),
  deadlineDays: z.number().int().nonnegative().nullable(),
  deadlineBasis: z.string().nullable(),
  penaltyOrRisk: z.string().nullable(),
  citationText: z.string().min(10),
  citationPage: z.number().int().nullable(),
  citationSection: z.string().nullable(),
  extractionConfidence: z.number().min(0).max(1),
  applicableCategoryCodes: z.array(z.string()), // e.g. ["IA"]
  sourceChunkIndexes: z.array(z.number().int()), // indexes into the chunk batch given to the LLM
});
export type ObligationCandidate = z.infer<typeof obligationCandidateSchema>;

export const obligationExtractionResultSchema = z.object({
  candidates: z.array(obligationCandidateSchema),
});
export type ObligationExtractionResult = z.infer<typeof obligationExtractionResultSchema>;
