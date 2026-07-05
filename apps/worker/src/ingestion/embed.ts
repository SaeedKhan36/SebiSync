import { GoogleGenAI } from "@google/genai";
import { createId } from "@paralleldrive/cuid2";
import { prisma } from "@sebi/db";
import type { ChunkInput } from "./chunker";

const EMBEDDING_DIMENSIONS = 768;
const BATCH_SIZE = 100;

// Lazily constructed: this module is statically reachable from server.ts,
// which executes before server.ts's own dotenv.config() calls run (ESM
// hoisting). Reading process.env at call time avoids capturing an empty key.
let genAI: GoogleGenAI | undefined;
function getGenAI(): GoogleGenAI {
  if (!genAI) {
    genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY ?? "" });
  }
  return genAI;
}

export interface EmbeddedChunk extends ChunkInput {
  embedding: number[];
}

// Batches chunk text through Gemini Embedding 001. Also used (single-item) by
// the extraction pipeline for the citation-storage embedding of a candidate's
// description text.
export async function embedChunks(chunks: ChunkInput[]): Promise<EmbeddedChunk[]> {
  const results: EmbeddedChunk[] = [];
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const response = await getGenAI().models.embedContent({
      model: "gemini-embedding-001",
      contents: batch.map((c) => c.text),
      config: { outputDimensionality: EMBEDDING_DIMENSIONS },
    });
    const embeddings = response.embeddings ?? [];
    batch.forEach((chunk, idx) => {
      const values = embeddings[idx]?.values;
      if (!values) throw new Error(`No embedding returned for chunk ${chunk.chunkIndex}`);
      results.push({ ...chunk, embedding: values });
    });
  }
  return results;
}

export async function embedText(text: string): Promise<number[]> {
  const response = await getGenAI().models.embedContent({
    model: "gemini-embedding-001",
    contents: [text],
    config: { outputDimensionality: EMBEDDING_DIMENSIONS },
  });
  const values = response.embeddings?.[0]?.values;
  if (!values) throw new Error("No embedding returned");
  return values;
}

function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

// Prisma can't write Unsupported("vector") columns via the generated client —
// each chunk (including its embedding) is inserted in one raw statement to
// avoid a partial-write race between a normal create() and a raw UPDATE.
export async function writeChunkEmbeddings(documentId: string, chunks: EmbeddedChunk[]) {
  for (const chunk of chunks) {
    const id = createId();
    await prisma.$executeRaw`
      INSERT INTO "DocumentChunk" (id, "documentId", "chunkIndex", "pageNumber", "sectionPath", text, embedding, "createdAt")
      VALUES (${id}, ${documentId}, ${chunk.chunkIndex}, ${chunk.pageNumber}, ${chunk.sectionPath}, ${chunk.text}, ${toVectorLiteral(chunk.embedding)}::vector, now())
    `;
  }
}
