import { z } from "zod";

// Provisions the active Clerk organization as an Intermediary. categoryCode
// must match an existing IntermediaryCategory.code (e.g. "IA").
export const provisionIntermediarySchema = z.object({
  name: z.string().min(1),
  categoryCode: z.string().min(1),
  sebiRegNo: z.string().optional(),
});
export type ProvisionIntermediary = z.infer<typeof provisionIntermediarySchema>;
