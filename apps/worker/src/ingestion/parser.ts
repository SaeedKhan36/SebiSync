import { prisma } from "@sebi/db";
import { downloadObject } from "../storage/r2";
import { extractTextLayer, type RawPage } from "./pdfTextLayer";
import { ocrPages } from "./pdfOcr";
import { buildSections } from "./pdfSections";

// Pure-TypeScript replacement for the Python Docling sidecar. The output shape
// is unchanged from the old docling-client.ts, so chunker.ts, embed.ts and the
// extraction agent needed no adjustment.
//
// Strategy, mirroring the sidecar's own routing but at page rather than
// document granularity:
//   1. unpdf reads the embedded text layer — verbatim, deterministic, free.
//   2. Any page whose text layer is near-empty is scanned; those pages (and
//      only those) go to Gemini for vision OCR in a single call.
//   3. Heading detection runs over the merged result to rebuild sectionPath.

export interface ParsedDocument {
  pages: Array<{
    pageNumber: number;
    sections: Array<{ sectionPath: string; text: string }>;
  }>;
  fullText: string;
  ocrUsed: boolean;
}

// Same threshold the sidecar used (pdf_utils.py MIN_CHARS_PER_PAGE): below
// this, a page's text layer is noise — a stray page number or a watermark —
// and the real content is an image.
const MIN_CHARS_PER_PAGE = 20;

/**
 * Takes a documentId rather than the document row: this function is a workflow
 * step boundary, and step inputs must be JSON-serializable, which a Prisma
 * model with Date fields is not (issuedDate would round-trip to a string).
 */
export async function parseDocument(documentId: string): Promise<ParsedDocument> {
  const document = await prisma.regulatoryDocument.findUniqueOrThrow({
    where: { id: documentId },
    select: { r2ObjectKey: true },
  });

  const pdfBytes = new Uint8Array(await downloadObject(document.r2ObjectKey));
  const { pages, pageCount } = await extractTextLayer(pdfBytes);

  const scannedPageNumbers = pages
    .filter((page) => page.charCount < MIN_CHARS_PER_PAGE)
    .map((page) => page.pageNumber);

  let merged: RawPage[] = pages;
  const ocrUsed = scannedPageNumbers.length > 0;

  if (ocrUsed) {
    console.log(
      `[parser] ${scannedPageNumbers.length}/${pageCount} page(s) have no usable text layer ` +
        `(pages ${scannedPageNumbers.join(", ")}); routing those through Gemini OCR.`,
    );
    const ocred = await ocrPages(pdfBytes, scannedPageNumbers);
    const byPageNumber = new Map(ocred.map((page) => [page.pageNumber, page]));
    // Only scanned pages are replaced. The sidecar took an all-or-nothing
    // decision here (>50% scanned meant OCRing the whole document), which
    // silently dropped scanned inserts inside otherwise-digital PDFs.
    merged = pages.map((page) => byPageNumber.get(page.pageNumber) ?? page);
  }

  const sectioned = buildSections(merged);

  return {
    pages: sectioned,
    // Matches docling_service.py:133 — sections joined by a blank line.
    fullText: sectioned
      .flatMap((page) => page.sections.map((section) => section.text))
      .join("\n\n"),
    ocrUsed,
  };
}
