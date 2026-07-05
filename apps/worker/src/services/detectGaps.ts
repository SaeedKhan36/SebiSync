import { prisma } from "@sebi/db";
import { writeAuditLog } from "../lib/audit";

const GRACE_PERIOD_DAYS = 30;

// Pure service function: no knowledge of HTTP, schedulers, or triggers.
// Callable from the manual POST /internal/detect-gaps route today, from a UI
// button, or from a future cron/scheduler trigger — all without changing this
// function. No locking needed — overlapping calls are idempotent because of
// the duplicate-gap check below.
export async function detectGaps(): Promise<{ created: number }> {
  const now = new Date();
  const items = await prisma.complianceChecklistItem.findMany({
    where: { status: { notIn: ["COMPLIANT", "NOT_APPLICABLE"] } },
    include: { evidenceRecords: { orderBy: { submittedAt: "desc" }, take: 1 } },
  });

  let created = 0;

  for (const item of items) {
    const latestEvidence = item.evidenceRecords[0];

    let gapType: "PAST_DEADLINE" | "MISSING_EVIDENCE" | "STALE_EVIDENCE" | null = null;
    let severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "MEDIUM";

    if (item.dueDate && item.dueDate < now && !latestEvidence) {
      gapType = "PAST_DEADLINE";
      const overdueMs = now.getTime() - item.dueDate.getTime();
      const deadlineMs = item.dueDate.getTime() - item.createdAt.getTime();
      severity = deadlineMs > 0 && overdueMs > 2 * deadlineMs ? "CRITICAL" : "HIGH";
    } else if (!item.dueDate && !latestEvidence) {
      const ageDays = (now.getTime() - item.createdAt.getTime()) / (24 * 60 * 60 * 1000);
      if (ageDays > GRACE_PERIOD_DAYS) {
        gapType = "MISSING_EVIDENCE";
        severity = "MEDIUM";
      }
    } else if (latestEvidence?.validUntil && latestEvidence.validUntil < now) {
      gapType = "STALE_EVIDENCE";
      severity = "MEDIUM";
    }

    if (!gapType) continue;

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
  }

  return { created };
}
