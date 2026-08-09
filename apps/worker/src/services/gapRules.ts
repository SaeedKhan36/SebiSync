export const GRACE_PERIOD_DAYS = 30;

// A deadline-less obligation with no evidence is not equally urgent forever.
// Just past the grace period it is a nudge; still open months later it is a
// genuine compliance failure, and flattening both to MEDIUM buries the second
// among the first. Set at twice the grace period so the escalation point is
// derived from the same tolerance rather than being a second magic number.
export const MISSING_EVIDENCE_ESCALATION_DAYS = GRACE_PERIOD_DAYS * 2;

export type GapType = "PAST_DEADLINE" | "MISSING_EVIDENCE" | "STALE_EVIDENCE";
export type GapSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface GapEvaluationInput {
  dueDate: Date | null;
  createdAt: Date;
  hasEvidence: boolean;
  latestEvidenceValidUntil?: Date | null;
}

export interface GapEvaluation {
  gapType: GapType;
  severity: GapSeverity;
}

// Pure decision logic, extracted from detectGaps so it's testable without a
// database: given a checklist item's shape "now", decide whether it's in a
// gap state and how severe. No side effects.
export function evaluateGap(item: GapEvaluationInput, now: Date): GapEvaluation | null {
  if (item.dueDate && item.dueDate < now && !item.hasEvidence) {
    const overdueMs = now.getTime() - item.dueDate.getTime();
    const deadlineMs = item.dueDate.getTime() - item.createdAt.getTime();
    const severity: GapSeverity = deadlineMs > 0 && overdueMs > 2 * deadlineMs ? "CRITICAL" : "HIGH";
    return { gapType: "PAST_DEADLINE", severity };
  }

  if (!item.dueDate && !item.hasEvidence) {
    const ageDays = (now.getTime() - item.createdAt.getTime()) / (24 * 60 * 60 * 1000);
    if (ageDays > GRACE_PERIOD_DAYS) {
      return {
        gapType: "MISSING_EVIDENCE",
        severity: ageDays > MISSING_EVIDENCE_ESCALATION_DAYS ? "MEDIUM" : "LOW",
      };
    }
    return null;
  }

  if (item.latestEvidenceValidUntil && item.latestEvidenceValidUntil < now) {
    return { gapType: "STALE_EVIDENCE", severity: "MEDIUM" };
  }

  return null;
}
