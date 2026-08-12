import type { ParsedDocument } from "./parser";

export interface ChunkInput {
  chunkIndex: number;
  pageNumber: number | null;
  sectionPath: string | null;
  text: string;
}

const TARGET_WORDS_MIN = 230; // ~300 tokens
const TARGET_WORDS_MAX = 385; // ~500 tokens

// Splits parsed output into ~300-500 token chunks, respecting section
// boundaries where possible: small consecutive sections are concatenated up
// to the cap; sections larger than the cap are split at sentence boundaries.
export function chunkDocument(parseResult: ParsedDocument): ChunkInput[] {
  const chunks: ChunkInput[] = [];
  let buffer: { pageNumber: number | null; sectionPath: string | null; words: string[] } | null =
    null;

  const flush = () => {
    if (buffer && buffer.words.length > 0) {
      chunks.push({
        chunkIndex: chunks.length,
        pageNumber: buffer.pageNumber,
        sectionPath: buffer.sectionPath,
        text: buffer.words.join(" "),
      });
    }
    buffer = null;
  };

  for (const page of parseResult.pages) {
    for (const section of page.sections) {
      const sentences = section.text.split(/(?<=[.!?])\s+/).filter(Boolean);
      for (const sentence of sentences) {
        const words = sentence.split(/\s+/).filter(Boolean);

        if (!buffer) {
          buffer = { pageNumber: page.pageNumber, sectionPath: section.sectionPath, words: [] };
        }

        if (buffer.words.length + words.length > TARGET_WORDS_MAX && buffer.words.length > 0) {
          flush();
          buffer = { pageNumber: page.pageNumber, sectionPath: section.sectionPath, words: [] };
        }

        buffer.words.push(...words);

        if (buffer.words.length >= TARGET_WORDS_MIN && buffer.sectionPath !== section.sectionPath) {
          flush();
        }
      }
    }
  }
  flush();

  return chunks;
}
