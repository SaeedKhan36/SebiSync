import { z } from "zod";
import { docStatusSchema } from "./enums";

export const createDocumentSchema = z.object({
  title: z.string(),
  circularNumber: z.string(),
  issuedDate: z.coerce.date(),
  sourceUrl: z.string(),
  supersedesId: z.string().optional(),
});
export type CreateDocument = z.infer<typeof createDocumentSchema>;

export const documentDtoSchema = z.object({
  id: z.string(),
  title: z.string(),
  circularNumber: z.string(),
  issuedDate: z.coerce.date(),
  sourceUrl: z.string(),
  r2ObjectKey: z.string(),
  status: docStatusSchema,
  createdAt: z.coerce.date(),
});
export type DocumentDto = z.infer<typeof documentDtoSchema>;
