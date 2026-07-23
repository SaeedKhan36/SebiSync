import { z } from "zod";

export const createClientSchema = z.object({
  name: z.string().min(1),
  onboardedAt: z.coerce.date().optional(),
});
export type CreateClient = z.infer<typeof createClientSchema>;

export const updateClientSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  onboardedAt: z.coerce.date().nullable().optional(),
});
export type UpdateClient = z.infer<typeof updateClientSchema>;
