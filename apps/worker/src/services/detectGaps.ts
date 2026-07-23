import { prisma } from "@sebi/db";
import { writeAuditLog } from "../lib/audit";
import { notifyGap } from "./notifyGap";
import { evaluateGap } from "./gapRules";

// Pure service function: no knowledge of HTTP, schedulers, or triggers.
// Callable from the manual POST /internal/detect-gaps route today, from a UI
// button, or from a future cron/scheduler trigger — all without changing this
// function. No locking needed — overlapping calls are idempotent because of
// the duplicate-gap check below.
export async function detectGaps(): Promise<{ created: number }> {
  const now = new Date();
  const items = await prisma.complianceChecklistItem.findMany({
    where: { status: { notIn: ["COMPLIANT", "NOT_APPLICABLE"] } },
    include: {
      evidenceRecords: { orderBy: { submittedAt: "desc" }, take: 1 },
      obligation: { select: { code: true, title: true } },
      client: { select: { name: true } },
      intermediary: { select: { clerkOrgId: true } },
    },
  });

  let created = 0;

  for (const item of items) {
    const latestEvidence = item.evidenceRecords[0];

    const evaluation = evaluateGap(
      {
        dueDate: item.dueDate,
        createdAt: item.createdAt,
        hasEvidence: Boolean(latestEvidence),
        latestEvidenceValidUntil: latestEvidence?.validUntil,
      },
      now,
    );
    if (!evaluation) continue;
    const { gapType, severity } = evaluation;

    const existingUnresolved = await prisma.complianceGap.findFirst({
      where: { checklistItemId: item.id, gapType, resolvedAt: null },
    });
    if (existingUnresolved) continue;

    const gap = await prisma.complianceGap.create({
      data: { checklistItemId: item.id, gapType, severity },
    });
    await prisma.complianceChecklistItem.update({
      where: { id: item.id },
      data: { status: "GAP" },
    });
    await writeAuditLog({
      intermediaryId: item.intermediaryId,
      entityType: "ComplianceGap",
      entityId: gap.id,
      action: "GAP_DETECTED",
      actorType: "SCHEDULED_JOB",
      afterState: gap,
      checklistItemId: item.id,
      gapId: gap.id,
    });
    created += 1;

    // A notification failure must never abort detection — the gap itself is
    // already recorded; notifiedAt stays null so the send can be retried.
    try {
      if (!item.intermediary.clerkOrgId) continue;
      const recipients = await notifyGap({
        gap,
        obligation: item.obligation,
        clientName: item.client?.name ?? null,
        dueDate: item.dueDate,
        clerkOrgId: item.intermediary.clerkOrgId,
      });
      if (recipients > 0) {
        await prisma.complianceGap.update({
          where: { id: gap.id },
          data: { notifiedAt: new Date() },
        });
        await writeAuditLog({
          intermediaryId: item.intermediaryId,
          entityType: "ComplianceGap",
          entityId: gap.id,
          action: "NOTIFIED",
          actorType: "SCHEDULED_JOB",
          metadata: { channel: "email", recipients },
          checklistItemId: item.id,
          gapId: gap.id,
        });
      }
    } catch (error) {
      console.error(`[detectGaps] notification failed for gap ${gap.id}:`, error);
    }
  }

  return { created };
}
