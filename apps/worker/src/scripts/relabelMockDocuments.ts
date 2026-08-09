// Finds mock/demo/test documents that are claiming to be real SEBI circulars,
// and strips the false provenance.
//
// Why this exists: a manually-seeded demo document was sitting in the database
// titled "Master Circular for Investment Advisers" and carrying the *genuine*
// circular number SEBI/HO/MIRSD-PoD-1/P/CIR/2024/50, while its stored object
// was Mock_SEBI_Compliance_Demo_Circular.pdf. Two problems, one worse than the
// other:
//
//   1. It collides with the real corpus at ingest time — two documents with the
//      same title makes `--document <id>` lookups and the demo ambiguous.
//   2. Far worse, it misrepresents fabricated content as a real regulatory
//      source. The entire trust claim of this product is that every obligation
//      traces back to text SEBI actually published. A mock row wearing a real
//      circular number quietly breaks that claim in the one place a reviewer
//      would think to check it.
//
// The fix is to relabel, never to delete: those demo rows carry real checklist
// items, evidence and detected gaps that the demo depends on. Deleting the
// document would take all of it.
//
// Detection is deliberately conservative — a document must look mock in its
// stored file or title AND claim SEBI provenance in its circular number. That
// pairing is what makes it a masquerade rather than merely one or the other.
//
// Idempotent by construction: once the circular number no longer starts with
// "SEBI/", the document stops matching and re-running is a no-op.
//
// Usage:
//   cd apps/worker && bun run relabel-mocks             # report only
//   cd apps/worker && bun run relabel-mocks -- --apply  # write the corrections

import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.resolve(import.meta.dirname, "../../../../packages/db/.env") });
dotenv.config({ path: path.resolve(import.meta.dirname, "../../.env") });

import { prisma } from "@sebi/db";

// Words that mark a document as fabricated rather than downloaded from SEBI.
const MOCK_MARKER = /mock|demo|test|sample|dummy|fixture/i;

// A real SEBI circular number always carries the issuing-department path.
// Anything matching this is asserting genuine provenance.
const CLAIMS_SEBI_PROVENANCE = /^SEBI\//i;

function correctedCircularNumber(documentId: string, issuedYear: number): string {
  // Derived from the document's own id so the value is stable across runs and
  // unique without needing to query for collisions.
  return `MOCK-${issuedYear}-${documentId.slice(-6).toUpperCase()}`;
}

function correctedTitle(title: string): string {
  return MOCK_MARKER.test(title) ? title : `${title} (mock — not a real SEBI circular)`;
}

async function main() {
  const apply = process.argv.includes("--apply");

  const documents = await prisma.regulatoryDocument.findMany({
    select: {
      id: true,
      title: true,
      circularNumber: true,
      issuedDate: true,
      r2ObjectKey: true,
      status: true,
      _count: { select: { chunks: true, obligations: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const masquerading = documents.filter(
    (d) =>
      (MOCK_MARKER.test(d.r2ObjectKey) || MOCK_MARKER.test(d.title)) &&
      CLAIMS_SEBI_PROVENANCE.test(d.circularNumber),
  );

  // Separate, cheaper problem: a document parked in a mid-pipeline status that
  // already has chunks and obligations. The pipeline finished; the status is
  // just stale, and it makes a healthy document look broken in the UI.
  const staleStatus = documents.filter(
    (d) =>
      (d.status === "PARSING" || d.status === "EXTRACTING") &&
      d._count.chunks > 0 &&
      d._count.obligations > 0,
  );

  if (masquerading.length === 0 && staleStatus.length === 0) {
    console.log("Nothing to correct: no mock document claims SEBI provenance, and no");
    console.log("document is parked in a stale mid-pipeline status.");
    return;
  }

  if (masquerading.length > 0) {
    console.log(`\n─── Mock documents claiming real SEBI provenance (${masquerading.length}) ───`);
    for (const d of masquerading) {
      console.log(`\n  ${d.id}`);
      console.log(`    object       ${d.r2ObjectKey}`);
      console.log(`    title        ${d.title}`);
      console.log(`                 → ${correctedTitle(d.title)}`);
      console.log(`    circular no. ${d.circularNumber}`);
      console.log(`                 → ${correctedCircularNumber(d.id, d.issuedDate.getFullYear())}`);
    }
  }

  if (staleStatus.length > 0) {
    console.log(`\n─── Documents parked in a stale status (${staleStatus.length}) ───`);
    for (const d of staleStatus) {
      console.log(
        `  ${d.id}  ${d.status} → EXTRACTED  ` +
          `(chunks=${d._count.chunks}, obligations=${d._count.obligations})  ${d.title}`,
      );
    }
  }

  if (!apply) {
    console.log(`\nReport only — nothing was changed. Re-run with --apply to write these corrections.`);
    return;
  }

  for (const d of masquerading) {
    await prisma.regulatoryDocument.update({
      where: { id: d.id },
      data: {
        title: correctedTitle(d.title),
        circularNumber: correctedCircularNumber(d.id, d.issuedDate.getFullYear()),
      },
    });
  }
  for (const d of staleStatus) {
    await prisma.regulatoryDocument.update({ where: { id: d.id }, data: { status: "EXTRACTED" } });
  }

  console.log(
    `\nCorrected ${masquerading.length} masquerading document(s) and ` +
      `${staleStatus.length} stale status(es).`,
  );
  console.log("No document, chunk, obligation, checklist item, evidence record or gap was deleted.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error("\nRelabelling failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
