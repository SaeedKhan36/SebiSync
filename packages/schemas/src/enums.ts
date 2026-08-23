import { z } from "zod";

// Mirrors the Prisma `DocStatus` enum.
export const docStatusSchema = z.enum([
  "UPLOADED",
  "PARSING",
  "PARSED",
  "EXTRACTING",
  "EXTRACTED",
  "FAILED",
]);
export type DocStatus = z.infer<typeof docStatusSchema>;

// Mirrors the Prisma `ObligationStatus` enum. This build only ever produces
// DRAFT and PUBLISHED — REVIEWED/SUPERSEDED exist in the DB enum but are unused.
export const obligationStatusSchema = z.enum([
  "DRAFT",
  "REVIEWED",
  "PUBLISHED",
  "SUPERSEDED",
]);
export type ObligationStatus = z.infer<typeof obligationStatusSchema>;

// Mirrors the Prisma `ChecklistStatus` enum.
export const checklistStatusSchema = z.enum([
  "PENDING",
  "IN_PROGRESS",
  "PENDING_REVIEW",
  "COMPLIANT",
  "GAP",
  "NOT_APPLICABLE",
]);
export type ChecklistStatus = z.infer<typeof checklistStatusSchema>;

// Mirrors the Prisma `GapType` enum.
export const gapTypeSchema = z.enum([
  "MISSING_EVIDENCE",
  "PAST_DEADLINE",
  "STALE_EVIDENCE",
  "INCOMPLETE",
]);
export type GapType = z.infer<typeof gapTypeSchema>;

// Mirrors the Prisma `GapSeverity` enum.
export const gapSeveritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
export type GapSeverity = z.infer<typeof gapSeveritySchema>;

// `Obligation.frequency` is a free-text String column in Prisma (not a DB enum),
// enforced as a string-literal union here at the application layer.
export const obligationFrequencySchema = z.enum([
  "PER_CLIENT",
  "PER_EVENT",
  "ANNUAL",
  "ONE_TIME",
]);
export type ObligationFrequency = z.infer<typeof obligationFrequencySchema>;

// `EvidenceRecord.evidenceType` is a free-text String column in Prisma (not a DB enum).
export const evidenceTypeSchema = z.enum([
  "DOCUMENT",
  "FORM_SUBMISSION",
  "LOG_ENTRY",
  "ATTESTATION",
]);
export type EvidenceType = z.infer<typeof evidenceTypeSchema>;

// `AuditLogEntry.actorType` is a free-text String column in Prisma (not a DB enum).
export const actorTypeSchema = z.enum(["SYSTEM_AGENT", "USER", "SCHEDULED_JOB"]);
export type ActorType = z.infer<typeof actorTypeSchema>;
