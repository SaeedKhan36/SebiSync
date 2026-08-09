// Puts the compliance dashboard into a believable state for a demo, WITHOUT
// fabricating any finding.
//
// Why this script has to exist: the gap engine is time-based, and a freshly
// ingested circular has no time behind it. evaluateGap only flags
// MISSING_EVIDENCE after a 30-day grace period, and checklist fan-out always
// sets dueDate to `now + deadlineDays` — in the future by construction. So
// ingest a circular today, publish it, and the gaps dashboard correctly reads
// zero. The most differentiated part of the product shows nothing.
//
// The fix is to age the *inputs*, not to invent the outputs. This script
// backdates checklist items and attaches real evidence records, then calls the
// real detectGaps(). Every ComplianceGap that appears was genuinely derived by
// the same engine that runs in production — no ComplianceGap row is ever
// written here. If the rules change, this demo changes with them, which is the
// point.
//
// Usage:
//   cd apps/worker && bun run demo:seed              # no emails sent
//   cd apps/worker && bun run demo:seed -- --notify  # let detectGaps email
//   cd apps/worker && bun run demo:seed -- --dry-run # show the plan, change nothing

import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.resolve(import.meta.dirname, "../../../../packages/db/.env") });
dotenv.config({ path: path.resolve(import.meta.dirname, "../../.env") });

import { prisma } from "@sebi/db";
import { detectGaps } from "../services/detectGaps";
import { GRACE_PERIOD_DAYS } from "../services/gapRules";

const DAY_MS = 24 * 60 * 60 * 1000;
const ago = (days: number) => new Date(Date.now() - days * DAY_MS);
const ahead = (days: number) => new Date(Date.now() + days * DAY_MS);

// Each bucket is an input shape chosen so that evaluateGap reaches a specific
// verdict. The expected outcome is written down next to it so that if the
// rules change and the demo stops showing what it claims, the mismatch is
// obvious here rather than mysterious on the dashboard.
//
// Note there is no LOW bucket: evaluateGap currently returns MEDIUM, HIGH or
// CRITICAL only, and inventing a LOW gap would mean writing a ComplianceGap
// row by hand — exactly what this script refuses to do.
type BucketName =
  | "compliant"
  | "staleEvidence"
  | "missingEvidence"
  | "pastDeadlineHigh"
  | "pastDeadlineCritical"
  | "upcoming";

interface Bucket {
  name: BucketName;
  expected: string;
  needsEvidence: boolean;
  createdAt: Date;
  dueDate: Date | null;
  // Only read when needsEvidence is true.
  evidenceValidUntil?: Date;
  markCompliant?: boolean;
}

const BUCKETS: Bucket[] = [
  {
    name: "compliant",
    expected: "COMPLIANT — evidence on file and still valid; detectGaps skips it entirely",
    needsEvidence: true,
    createdAt: ago(45),
    dueDate: ago(20),
    evidenceValidUntil: ahead(300),
    markCompliant: true,
  },
  {
    name: "staleEvidence",
    expected: "STALE_EVIDENCE / MEDIUM — evidence exists but expired 20 days ago",
    needsEvidence: true,
    createdAt: ago(200),
    dueDate: null,
    evidenceValidUntil: ago(20),
  },
  {
    name: "missingEvidence",
    expected: `MISSING_EVIDENCE / MEDIUM — no deadline, no evidence, older than the ${GRACE_PERIOD_DAYS}-day grace period`,
    needsEvidence: false,
    createdAt: ago(GRACE_PERIOD_DAYS + 30),
    dueDate: null,
  },
  {
    name: "pastDeadlineHigh",
    // 30-day window, 10 days overdue: overdue < 2× window, so HIGH not CRITICAL.
    expected: "PAST_DEADLINE / HIGH — 10 days overdue against a 30-day window",
    needsEvidence: false,
    createdAt: ago(40),
    dueDate: ago(10),
  },
  {
    name: "pastDeadlineCritical",
    // 10-day window, 90 days overdue: overdue > 2× window → CRITICAL.
    expected: "PAST_DEADLINE / CRITICAL — 90 days overdue against a 10-day window",
    needsEvidence: false,
    createdAt: ago(100),
    dueDate: ago(90),
  },
  {
    name: "upcoming",
    expected: "no gap — due in 12 days, still inside its window",
    needsEvidence: false,
    createdAt: ago(3),
    dueDate: ahead(12),
  },
];

function parseFlags() {
  const argv = process.argv.slice(2);
  return {
    notify: argv.includes("--notify"),
    dryRun: argv.includes("--dry-run"),
  };
}

async function main() {
  const { notify, dryRun } = parseFlags();

  // detectGaps emails every gap it creates (services/notifyGap.ts reads
  // RESEND_API_KEY at call time and returns 0 when it is absent). A demo
  // seeder that silently sends a burst of real mail to the owner's inbox is a
  // nasty surprise, so sending is opt-in rather than opt-out.
  if (!notify) {
    delete process.env.RESEND_API_KEY;
    console.log("Email notifications suppressed (pass --notify to allow detectGaps to send).");
  } else {
    console.log("⚠ --notify: detectGaps WILL send a real email per gap it creates.");
  }

  const intermediaries = await prisma.intermediary.findMany({
    include: { category: { select: { code: true } } },
    orderBy: { createdAt: "asc" },
  });

  const items = await prisma.complianceChecklistItem.findMany({
    include: {
      evidenceRecords: { select: { id: true } },
      obligation: { select: { code: true, title: true } },
      intermediary: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  if (items.length === 0) {
    console.error(
      "\nNo ComplianceChecklistItem rows exist, so there is nothing to age.\n" +
        "Ingest a circular, then publish its obligations at /obligations/review — fan-out\n" +
        "creates the checklist items this script shapes.",
    );
    process.exit(1);
  }

  console.log(`\nFound ${items.length} checklist item(s) across ${intermediaries.length} intermediary(ies).`);

  // Assign buckets per intermediary so both tenants end up with a mixed
  // posture, rather than one firm absorbing every gap.
  const plan = new Map<string, Bucket>();
  const byIntermediary = new Map<string, typeof items>();
  for (const item of items) {
    byIntermediary.set(item.intermediaryId, [...(byIntermediary.get(item.intermediaryId) ?? []), item]);
  }

  for (const tenantItems of byIntermediary.values()) {
    // Items that already carry evidence go to the evidence-requiring buckets
    // first: those are the only buckets whose shape they can reach without
    // deleting an EvidenceRecord, and deleting real evidence to make a demo
    // look better is not a trade worth making.
    const withEvidence = tenantItems.filter((i) => i.evidenceRecords.length > 0);
    const withoutEvidence = tenantItems.filter((i) => i.evidenceRecords.length === 0);
    const evidenceBuckets = BUCKETS.filter((b) => b.needsEvidence);
    const plainBuckets = BUCKETS.filter((b) => !b.needsEvidence);

    withEvidence.forEach((item, i) => plan.set(item.id, evidenceBuckets[i % evidenceBuckets.length]!));
    withoutEvidence.forEach((item, i) => {
      // Round-robin across every bucket, so a tenant with no existing evidence
      // still gets a compliant/stale item (the seeder creates the evidence).
      plan.set(item.id, BUCKETS[i % BUCKETS.length] ?? plainBuckets[0]!);
    });
  }

  console.log("\n─── Plan ───");
  for (const bucket of BUCKETS) {
    const count = [...plan.values()].filter((b) => b.name === bucket.name).length;
    console.log(`  ${bucket.name.padEnd(22)} ${String(count).padStart(3)}  → ${bucket.expected}`);
  }

  if (dryRun) {
    console.log("\n--dry-run: nothing was changed.");
    return;
  }

  // Open gaps from a previous run would suppress re-detection (detectGaps
  // skips an item that already has an unresolved gap of the same type), so
  // they are resolved with an explicit note rather than deleted — the history
  // stays readable and the audit trail stays intact.
  const reset = await prisma.complianceGap.updateMany({
    where: { resolvedAt: null, checklistItemId: { in: [...plan.keys()] } },
    data: { resolvedAt: new Date(), resolutionNote: "Reset by demo scenario seeder" },
  });
  if (reset.count > 0) console.log(`\nResolved ${reset.count} pre-existing open gap(s) before re-detection.`);

  let evidenceCreated = 0;
  for (const item of items) {
    const bucket = plan.get(item.id);
    if (!bucket) continue;

    if (bucket.needsEvidence && item.evidenceRecords.length === 0) {
      await prisma.evidenceRecord.create({
        data: {
          checklistItemId: item.id,
          clientId: item.clientId,
          evidenceType: "DOCUMENT",
          description: `Demo evidence for ${item.obligation.code}`,
          submittedByUserId: "demo-scenario-seeder",
          submittedAt: bucket.createdAt,
          validUntil: bucket.evidenceValidUntil,
        },
      });
      evidenceCreated += 1;
    } else if (bucket.needsEvidence) {
      // Existing evidence: only its validity window is moved, so the record
      // itself (and whoever submitted it) is preserved.
      await prisma.evidenceRecord.updateMany({
        where: { checklistItemId: item.id },
        data: { validUntil: bucket.evidenceValidUntil },
      });
    }

    await prisma.complianceChecklistItem.update({
      where: { id: item.id },
      data: {
        // createdAt is a plain @default(now()) rather than @updatedAt, so it
        // is settable — which is the only reason ageing an item is possible
        // at all.
        createdAt: bucket.createdAt,
        dueDate: bucket.dueDate,
        status: bucket.markCompliant ? "COMPLIANT" : "PENDING",
        lastEvidenceAt: bucket.needsEvidence ? bucket.createdAt : null,
      },
    });
  }

  console.log(`\nAged ${plan.size} checklist item(s); created ${evidenceCreated} evidence record(s).`);
  console.log("\nRunning the real detectGaps()…");
  const { created } = await detectGaps();
  console.log(`  detectGaps created ${created} gap(s).`);

  const gaps = await prisma.complianceGap.groupBy({
    by: ["gapType", "severity"],
    where: { resolvedAt: null },
    _count: true,
  });

  console.log("\n─── Open gaps now on the dashboard ───");
  if (gaps.length === 0) {
    console.log("  none — check the plan above against services/gapRules.ts");
  }
  for (const g of gaps.sort((a, b) => a.gapType.localeCompare(b.gapType))) {
    console.log(`  ${g.gapType.padEnd(18)} ${g.severity.padEnd(9)} ${g._count}`);
  }

  const statuses = await prisma.complianceChecklistItem.groupBy({ by: ["status"], _count: true });
  console.log("\n─── Checklist posture ───");
  for (const s of statuses) console.log(`  ${s.status.padEnd(16)} ${s._count}`);

  console.log(
    "\nEvery gap above was produced by detectGaps() from the aged inputs — none was inserted directly.",
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error("\nDemo scenario seeding failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
