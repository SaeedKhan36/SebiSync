import { z } from "zod";
import { docStatusSchema } from "./enums";

export const createDocumentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  circularNumber: z.string().min(1, "Circular number is required"),
  issuedDate: z.coerce.date(),
  // Empty string is allowed — extraction runs on the uploaded PDF, so a
  // sebi.gov.in link is provenance only, never required to ingest.
  sourceUrl: z.string().url().or(z.literal("")),
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
