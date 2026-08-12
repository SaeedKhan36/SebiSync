import { GoogleGenAI, createPartFromBase64, createUserContent } from "@google/genai";
import { z } from "zod";
import type { RawPage } from "./pdfTextLayer";

// OCR for pages whose embedded text layer is empty — i.e. scanned images.
// Replaces PaddleOCR (services/docling-sidecar/app/services/ocr_service.py).
//
// Gemini accepts a PDF directly and rasterizes it server-side, so unlike
// PaddleOCR/tesseract.js there is nothing to render locally: no PyMuPDF, no
// poppler, no @napi-rs/canvas, no WASM. That is what keeps this deployable as
// a plain serverless function.

const OCR_MODEL = "gemini-2.5-flash";

// Gemini's documented ceiling is 1000 pages. Inline request bodies are capped
// well below the 50MB file limit, so refuse early with an actionable message
// rather than letting the API reject a 30MB base64 payload.
const MAX_INLINE_BYTES = 20 * 1024 * 1024;
const MAX_PAGES = 1000;

// Lazily constructed — see embed.ts:9-18 for why (ESM static-import hoisting
// runs this module's top-level code before server.ts's dotenv.config() calls).
let genAI: GoogleGenAI | undefined;
function getGenAI(): GoogleGenAI {
  if (!genAI) {
    genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY ?? "" });
  }
  return genAI;
}

// Gemini returns lines rather than sections: heading detection then runs over
// OCR and native pages through the same code path (pdfSections.ts), instead of
// asking the model to guess at a structure the deterministic heuristics
// already handle.
const ocrResponseSchema = z.object({
  pages: z.array(
    z.object({
      pageNumber: z.number().int().positive(),
      lines: z.array(z.string()),
    }),
  ),
});

function buildPrompt(pageNumbers: number[]): string {
  return [
    "You are transcribing scanned pages of an Indian securities-regulation circular.",
    `Transcribe ONLY these pages: ${pageNumbers.join(", ")}. Ignore every other page.`,
    "",
    "Rules:",
    "- Transcribe the text exactly as printed. Do not paraphrase, summarise, correct, translate or renumber anything.",
    "- Preserve clause numbering (1., 2.1, (a), (i)) exactly as it appears at the start of the line it belongs to.",
    "- Emit one array entry per visual line, in reading order.",
    "- Render a table as one line per row, cells separated by ' | '.",
    "- Omit running headers, footers and page numbers.",
    "- If a listed page has no legible text, return it with an empty lines array.",
    "",
    'Return JSON only: {"pages":[{"pageNumber":<int>,"lines":["<line>"]}]}',
  ].join("\n");
}

/** OCRs the given pages of `pdfBytes` and returns them in RawPage form. */
export async function ocrPages(pdfBytes: Uint8Array, pageNumbers: number[]): Promise<RawPage[]> {
  if (pageNumbers.length === 0) return [];

  if (pdfBytes.byteLength > MAX_INLINE_BYTES) {
    throw new Error(
      `PDF is ${(pdfBytes.byteLength / 1024 / 1024).toFixed(1)}MB, above the ${MAX_INLINE_BYTES / 1024 / 1024}MB inline limit for Gemini OCR. ` +
        "Upload it via the Gemini Files API instead, or split the document.",
    );
  }
  if (pageNumbers.length > MAX_PAGES) {
    throw new Error(`Cannot OCR ${pageNumbers.length} pages; Gemini's limit is ${MAX_PAGES}.`);
  }

  const response = await getGenAI().models.generateContent({
    model: OCR_MODEL,
    contents: createUserContent([
      createPartFromBase64(Buffer.from(pdfBytes).toString("base64"), "application/pdf"),
      buildPrompt(pageNumbers),
    ]),
    config: { responseMimeType: "application/json" },
  });

  console.log(
    `[pdfOcr] OCRed ${pageNumbers.length} scanned page(s) via ${OCR_MODEL}. ` +
      `promptTokens=${response.usageMetadata?.promptTokenCount ?? "n/a"} ` +
      `totalTokens=${response.usageMetadata?.totalTokenCount ?? "n/a"}`,
  );

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(response.text ?? "{}");
  } catch {
    throw new Error("Gemini OCR did not return valid JSON");
  }

  const parsed = ocrResponseSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new Error(`Gemini OCR returned an unexpected shape: ${parsed.error.message}`);
  }

  // Drop anything outside the requested set — the model occasionally
  // transcribes neighbouring pages despite the instruction, and letting those
  // through would overwrite pages whose real text layer we already trust.
  const requested = new Set(pageNumbers);
  return parsed.data.pages
    .filter((page) => requested.has(page.pageNumber))
    .map((page) => {
      const lines = page.lines
        .map((text) => text.replace(/\s+/g, " ").trim())
        .filter((text) => text.length > 0)
        // fontSize and width are 0: a rasterized page carries no font metrics
        // or geometry. pdfSections.ts reads 0 as "no signal" and falls back to
        // its numbering and capitalisation rules, rather than deriving bogus
        // headings from fabricated measurements.
        .map((text) => ({ text, fontSize: 0, width: 0 }));
      return {
        pageNumber: page.pageNumber,
        lines,
        charCount: lines.reduce((sum, line) => sum + line.text.length, 0),
      };
    });
}
