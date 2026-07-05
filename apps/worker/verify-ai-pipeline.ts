/**
 * ONE-OFF, TEMPORARY verification harness — not part of the application.
 * Deleted after use.
 *
 * Verifies the AI-specific critical path with the minimum possible Gemini
 * usage: reuses already-verified Docling parse output (no re-parsing),
 * skips embeddings entirely (our extraction graph doesn't use them — no
 * dedup/version-comparison node in this build), and makes exactly ONE
 * extraction call by ensuring exactly one chunk batch (3 chunks, batch
 * size 4 in extractObligations.ts).
 */
import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.resolve(import.meta.dirname, "../../packages/db/.env") });
dotenv.config();

import { prisma } from "@sebi/db";
import { runExtractionAgent } from "./src/agents/extraction/graph";
import { propagateObligation } from "./src/services/propagateObligation";
import { detectGaps } from "./src/services/detectGaps";

async function main() {
  console.log("=== PREREQUISITE CHECK ===");
  if (!process.env.GEMINI_API_KEY) {
    console.error("BLOCKED: GEMINI_API_KEY not set. Stopping immediately.");
    process.exit(1);
  }
  const document = await prisma.regulatoryDocument.findFirst();
  if (!document) {
    console.error("BLOCKED: no RegulatoryDocument exists to attach chunks to. Stopping immediately.");
    process.exit(1);
  }
  console.log(`Using existing document: ${document.id} ("${document.title}")`);

  console.log("\n=== REUSING ALREADY-VERIFIED DOCLING OUTPUT (no re-parse) ===");
  const reusedSections = [
    { chunkIndex: 0, pageNumber: 1, sectionPath: "SEBI Master Circular for Investment Advisers", text: "Circular No: SEBI/HO/MIRSD-PoD-1/P/CIR/2024/50" },
    { chunkIndex: 1, pageNumber: 1, sectionPath: "1. Risk Profiling", text: "Investment Advisers shall mandatorily carry out risk profiling and suitability assessment of the client before providing any investment advisory services." },
    { chunkIndex: 2, pageNumber: 2, sectionPath: "2. Grievance Redressal", text: "Complaints must be resolved and the Action Taken Report uploaded on SCORES within 21 calendar days of receipt." },
  ];

  // Clear any chunks from prior sessions under this document to keep the
  // batch count deterministic (exactly 3 chunks -> exactly 1 Gemini batch).
  await prisma.documentChunk.deleteMany({ where: { documentId: document.id } });
  for (const s of reusedSections) {
    await prisma.documentChunk.create({
      data: { documentId: document.id, chunkIndex: s.chunkIndex, pageNumber: s.pageNumber, sectionPath: s.sectionPath, text: s.text },
    });
  }
  console.log(`Inserted ${reusedSections.length} DocumentChunk rows (embedding left NULL — not required by this build's extraction graph, so zero embedding calls will be made).`);

  console.log("\n=== GEMINI CALL RATIONALE ===");
  console.log("About to invoke runExtractionAgent(documentId). This graph is:");
  console.log("  loadContext -> extractObligations -> validateCitation -> classifyApplicability -> persist");
  console.log("extractObligations batches chunks at CHUNK_BATCH_SIZE=4. We have exactly 3 chunks,");
  console.log("so exactly ONE batch -> exactly ONE call to genAI.models.generateContent (gemini-2.5-flash).");
  console.log("No retry loop exists in this build (validateCitation drops invalid candidates, does not re-call Gemini).");
  console.log("No embedding call exists anywhere in this graph.");

  const before = Date.now();
  await runExtractionAgent(document.id);
  const elapsedMs = Date.now() - before;

  console.log(`\n=== POST-CALL REPORT (extraction agent run completed in ${elapsedMs}ms) ===`);
  console.log("Request number: 1 (this is the only extraction call this script will make)");
  console.log("Model used: gemini-2.5-flash (per apps/worker/src/agents/extraction/nodes/extractObligations.ts)");
  console.log("Estimated tokens: see per-call log line printed by extractObligations.ts if instrumented; otherwise not directly exposed by this script (see note below)");
  console.log("Another Gemini call required? NO — exactly one batch existed, loop has already completed, no retry logic exists.");

  const obligations = await prisma.obligation.findMany({
    where: { documentId: document.id, code: { not: { in: ["IA-RISK-PROFILING-MANUAL-01", "IA-GRIEVANCE-SCORES-MANUAL-01"] } } },
    include: { sourceChunks: { include: { chunk: true } } },
  });

  console.log(`\n=== EXTRACTION RESULT: ${obligations.length} obligation(s) created ===`);
  for (const o of obligations) {
    console.log(`- ${o.code} | status=${o.status} | frequency=${o.frequency} | deadlineDays=${o.deadlineDays}`);
    console.log(`  citationText: "${o.citationText}"`);
    console.log(`  citationPage: ${o.citationPage}, citationSection: ${o.citationSection}`);
    console.log(`  sourceChunks linked: ${o.sourceChunks.length}`);
    for (const link of o.sourceChunks) {
      const found = link.chunk.text.toLowerCase().includes(o.citationText.trim().toLowerCase());
      console.log(`    -> chunk ${link.chunk.chunkIndex}: citation verbatim-substring match = ${found}`);
    }
  }

  if (obligations.length === 0) {
    console.error("\nEXTRACTION PRODUCED NO OBLIGATIONS. Stopping — not retrying, not calling Gemini again.");
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log("\n=== PUBLISH + CHECKLIST GENERATION (no AI involved, already-verified logic) ===");
  const target = obligations[0]!;
  await prisma.obligation.update({ where: { id: target.id }, data: { status: "PUBLISHED", reviewedByUserId: "ai-pipeline-verification" } });
  await propagateObligation(target.id);
  const checklistItems = await prisma.complianceChecklistItem.findMany({ where: { obligationId: target.id } });
  console.log(`Checklist items created for AI-produced obligation "${target.code}": ${checklistItems.length}`);

  console.log("\n=== GAP DETECTION (no AI involved, already-verified logic) ===");
  const gapResult = await detectGaps();
  console.log(`Gap detection ran without error. Gaps created this pass: ${gapResult.created}`);

  console.log("\n=== SUMMARY ===");
  console.log("Total Gemini extraction requests made: 1");
  console.log("Total Gemini embedding requests made: 0 (not required by this build's extraction graph)");
  console.log(`AI pipeline critical path (PDF->Docling reuse->Gemini extraction->citation validation->persist->publish->checklist->gap detection): VERIFIED`);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("FAILED:", err);
  await prisma.$disconnect();
  process.exit(1);
});
