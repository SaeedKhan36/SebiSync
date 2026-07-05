import { GoogleGenAI } from "@google/genai";
import { prisma } from "@sebi/db";
import { obligationExtractionResultSchema, type ObligationCandidate } from "@sebi/schemas";
import { buildExtractionPrompt } from "../prompts/extractionPrompt";
import type { ExtractionStateType } from "../state";

const CHUNK_BATCH_SIZE = 4;

// Lazily constructed — see storage/r2.ts for why (ESM static-import hoisting
// runs this module's top-level code before server.ts's dotenv.config() calls).
let genAI: GoogleGenAI | undefined;
function getGenAI(): GoogleGenAI {
  if (!genAI) {
    genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY ?? "" });
  }
  return genAI;
}

export async function extractObligations(
  state: ExtractionStateType,
): Promise<Partial<ExtractionStateType>> {
  const document = await prisma.regulatoryDocument.findUniqueOrThrow({
    where: { id: state.documentId },
  });
  const corpusContext = {
    title: document.title,
    circularNumber: document.circularNumber,
    issuedDate: document.issuedDate.toISOString(),
  };

  const allCandidates: ObligationCandidate[] = [];
  const errors: string[] = [];

  for (let i = 0; i < state.chunks.length; i += CHUNK_BATCH_SIZE) {
    const batch = state.chunks.slice(i, i + CHUNK_BATCH_SIZE);
    const prompt = buildExtractionPrompt(batch, corpusContext);

    const response = await getGenAI().models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });

    const rawText = response.text ?? "{}";
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawText);
    } catch {
      errors.push(`Batch starting at chunk ${i}: model did not return valid JSON`);
      continue;
    }

    const parsed = obligationExtractionResultSchema.safeParse(parsedJson);
    if (!parsed.success) {
      errors.push(`Batch starting at chunk ${i}: ${parsed.error.message}`);
      continue;
    }

    // sourceChunkIndexes from the model are relative to this batch; remap to
    // the absolute chunk index used elsewhere in the pipeline.
    for (const candidate of parsed.data.candidates) {
      allCandidates.push({
        ...candidate,
        sourceChunkIndexes: candidate.sourceChunkIndexes.map((idx) => i + idx),
      });
    }
  }

  return { candidates: allCandidates, errors };
}
