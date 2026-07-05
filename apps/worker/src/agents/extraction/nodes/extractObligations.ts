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

  const totalBatches = Math.ceil(state.chunks.length / CHUNK_BATCH_SIZE);
  let requestNumber = 0;

  for (let i = 0; i < state.chunks.length; i += CHUNK_BATCH_SIZE) {
    const batch = state.chunks.slice(i, i + CHUNK_BATCH_SIZE);
    const prompt = buildExtractionPrompt(batch, corpusContext);

    requestNumber += 1;
    const isLastBatch = i + CHUNK_BATCH_SIZE >= state.chunks.length;
    console.log(
      `[extractObligations] Gemini call ${requestNumber}/${totalBatches}: ` +
        `necessary because chunks ${i}-${i + batch.length - 1} of ${state.chunks.length} ` +
        `have not yet been sent for extraction (no cached/prior result exists for this batch).`,
    );

    const response = await getGenAI().models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });

    console.log(
      `[extractObligations] Gemini call ${requestNumber} complete. model=gemini-2.5-flash ` +
        `promptTokens=${response.usageMetadata?.promptTokenCount ?? "n/a"} ` +
        `candidateTokens=${response.usageMetadata?.candidatesTokenCount ?? "n/a"} ` +
        `totalTokens=${response.usageMetadata?.totalTokenCount ?? "n/a"} ` +
        `anotherCallRequired=${!isLastBatch} (no retry logic exists in this build regardless of parse outcome)`,
    );

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
