import { prisma } from "@sebi/db";
import type { Prisma } from "@sebi/db";

interface WriteAuditLogInput {
  // Optional: unset for global regulatory events (document ingestion,
  // obligation extraction/publish) that aren't scoped to a tenant.
  intermediaryId?: string;
  entityType: "RegulatoryDocument" | "Obligation" | "ChecklistItem" | "EvidenceRecord" | "ComplianceGap";
  entityId: string;
  action: string;
  actorType: "SYSTEM_AGENT" | "USER" | "SCHEDULED_JOB";
  actorUserId?: string;
  beforeState?: Prisma.InputJsonValue;
  afterState?: Prisma.InputJsonValue;
  metadata?: Prisma.InputJsonValue;
  obligationId?: string;
  checklistItemId?: string;
  evidenceRecordId?: string;
  gapId?: string;
}

export function writeAuditLog(input: WriteAuditLogInput) {
  return prisma.auditLogEntry.create({
    data: {
      intermediaryId: input.intermediaryId,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      actorType: input.actorType,
      actorUserId: input.actorUserId,
      beforeState: input.beforeState,
      afterState: input.afterState,
      metadata: input.metadata,
      obligationId: input.obligationId,
      checklistItemId: input.checklistItemId,
      evidenceRecordId: input.evidenceRecordId,
      gapId: input.gapId,
    },
  });
}
