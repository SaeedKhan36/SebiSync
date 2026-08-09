import { describe, expect, it } from "vitest";
import { evaluateGap, GRACE_PERIOD_DAYS, MISSING_EVIDENCE_ESCALATION_DAYS } from "./gapRules";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("evaluateGap", () => {
  it("flags PAST_DEADLINE/HIGH when overdue with no evidence, within 2x the deadline window", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const createdAt = new Date("2025-12-01T00:00:00Z"); // 31-day window
    const dueDate = new Date("2025-12-20T00:00:00Z"); // overdue by 12 days, window is 19 days
    const result = evaluateGap({ dueDate, createdAt, hasEvidence: false }, now);
    expect(result).toEqual({ gapType: "PAST_DEADLINE", severity: "HIGH" });
  });

  it("escalates to CRITICAL when overdue by more than 2x the deadline window", () => {
    const now = new Date("2026-03-01T00:00:00Z");
    const createdAt = new Date("2025-12-01T00:00:00Z");
    const dueDate = new Date("2025-12-11T00:00:00Z"); // 10-day window, now ~80 days overdue
    const result = evaluateGap({ dueDate, createdAt, hasEvidence: false }, now);
    expect(result).toEqual({ gapType: "PAST_DEADLINE", severity: "CRITICAL" });
  });

  it("stays HIGH (not CRITICAL) when the deadline window is zero or negative", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const createdAt = new Date("2025-12-01T00:00:00Z");
    const dueDate = createdAt; // deadlineMs === 0
    const result = evaluateGap({ dueDate, createdAt, hasEvidence: false }, now);
    expect(result).toEqual({ gapType: "PAST_DEADLINE", severity: "HIGH" });
  });

  it("returns null for an overdue item that already has evidence", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const createdAt = new Date("2025-12-01T00:00:00Z");
    const dueDate = new Date("2025-12-20T00:00:00Z");
    const result = evaluateGap({ dueDate, createdAt, hasEvidence: true }, now);
    expect(result).toBeNull();
  });

  it("returns null for a no-due-date item younger than the grace period", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const createdAt = new Date(now.getTime() - (GRACE_PERIOD_DAYS - 1) * DAY_MS);
    const result = evaluateGap({ dueDate: null, createdAt, hasEvidence: false }, now);
    expect(result).toBeNull();
  });

  it("flags MISSING_EVIDENCE/LOW just past the grace period", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const createdAt = new Date(now.getTime() - (GRACE_PERIOD_DAYS + 1) * DAY_MS);
    const result = evaluateGap({ dueDate: null, createdAt, hasEvidence: false }, now);
    expect(result).toEqual({ gapType: "MISSING_EVIDENCE", severity: "LOW" });
  });

  it("escalates MISSING_EVIDENCE to MEDIUM once it is long overdue", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const createdAt = new Date(now.getTime() - (MISSING_EVIDENCE_ESCALATION_DAYS + 1) * DAY_MS);
    const result = evaluateGap({ dueDate: null, createdAt, hasEvidence: false }, now);
    expect(result).toEqual({ gapType: "MISSING_EVIDENCE", severity: "MEDIUM" });
  });

  it("stays LOW exactly at the escalation boundary", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const createdAt = new Date(now.getTime() - MISSING_EVIDENCE_ESCALATION_DAYS * DAY_MS);
    const result = evaluateGap({ dueDate: null, createdAt, hasEvidence: false }, now);
    expect(result).toEqual({ gapType: "MISSING_EVIDENCE", severity: "LOW" });
  });

  it("flags STALE_EVIDENCE/MEDIUM when evidence exists but has expired", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const createdAt = new Date("2025-01-01T00:00:00Z");
    const result = evaluateGap(
      {
        dueDate: null,
        createdAt,
        hasEvidence: true,
        latestEvidenceValidUntil: new Date("2025-12-01T00:00:00Z"),
      },
      now,
    );
    expect(result).toEqual({ gapType: "STALE_EVIDENCE", severity: "MEDIUM" });
  });

  it("returns null when evidence is present and still valid", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const createdAt = new Date("2025-01-01T00:00:00Z");
    const result = evaluateGap(
      {
        dueDate: null,
        createdAt,
        hasEvidence: true,
        latestEvidenceValidUntil: new Date("2026-06-01T00:00:00Z"),
      },
      now,
    );
    expect(result).toBeNull();
  });
});
