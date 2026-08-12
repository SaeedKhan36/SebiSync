import { extractTextItems } from "unpdf";

// Reads a PDF's embedded text layer. Replaces the PyMuPDF half of the old
// Python sidecar (services/docling-sidecar/app/services/pdf_utils.py).
//
// unpdf ships a serverless build of PDF.js — pure JavaScript, no native
// bindings, no WASM — which is what lets this run inside a Vercel function.
// We use extractTextItems() rather than the simpler extractText() because
// heading detection (pdfSections.ts) needs per-item font size, and
// extractText() collapses that away.
//
// DO NOT remove `pdfjs-dist` from package.json as an unused dependency. Nothing
// imports it, by design: unpdf locates it at runtime with
// import.meta.resolve("pdfjs-dist/package.json") to find its standard_fonts/
// and cmaps/ directories, and it bundles its own copy of PDF.js otherwise.
// The lookup sits in a try/catch, so a missing package does not throw — text
// extraction just quietly degrades for non-embedded standard fonts and CJK
// encodings. trigger.config.ts pins it via additionalPackages() for the same
// reason.

export interface TextLine {
  text: string;
  /** Largest font size among the items making up this line. */
  fontSize: number;
  /**
   * Rendered width in PDF units. Section detection compares this against the
   * page's text-column width to tell a wrapped line (runs the full column)
   * from a heading (does not). OCR lines have no geometry and report 0.
   */
  width: number;
}

export interface RawPage {
  pageNumber: number;
  lines: TextLine[];
  /** Length of the page's trimmed text. Drives the scanned-page check. */
  charCount: number;
}

export interface TextLayer {
  pages: RawPage[];
  pageCount: number;
}

// Two items belong to the same visual line when their baselines sit within
// this fraction of the font size. Superscripts and minor baseline jitter stay
// on the line; a genuine new line is always further than half a line height.
const BASELINE_TOLERANCE_RATIO = 0.5;

// A horizontal gap wider than this fraction of the font size means the PDF
// intended a space. PDF.js emits separate items per text-showing operator, so
// "shall be" often arrives as ["shall", "be"] with no space of its own —
// joining blind would produce "shallbe" and break verbatim citation matching.
const WORD_GAP_RATIO = 0.2;

interface PositionedItem {
  str: string;
  x: number;
  y: number;
  width: number;
  fontSize: number;
}

function groupIntoLines(items: PositionedItem[]): TextLine[] {
  // PDF coordinate space has its origin at the bottom-left, so descending y is
  // top-to-bottom reading order.
  const sorted = [...items].sort((a, b) => (b.y - a.y) || (a.x - b.x));

  const lines: TextLine[] = [];
  let current: PositionedItem[] = [];

  const flush = () => {
    if (current.length === 0) return;

    let text = "";
    let previous: PositionedItem | undefined;
    for (const item of current) {
      if (previous) {
        const gap = item.x - (previous.x + previous.width);
        const needsSpace = gap > previous.fontSize * WORD_GAP_RATIO;
        if (needsSpace && !text.endsWith(" ") && !item.str.startsWith(" ")) {
          text += " ";
        }
      }
      text += item.str;
      previous = item;
    }

    text = text.replace(/\s+/g, " ").trim();
    if (text) {
      const left = Math.min(...current.map((i) => i.x));
      const right = Math.max(...current.map((i) => i.x + i.width));
      lines.push({
        text,
        fontSize: Math.max(...current.map((i) => i.fontSize)),
        width: right - left,
      });
    }
    current = [];
  };

  for (const item of sorted) {
    const anchor = current[0];
    if (anchor) {
      const tolerance = Math.max(anchor.fontSize, 1) * BASELINE_TOLERANCE_RATIO;
      if (Math.abs(item.y - anchor.y) > tolerance) flush();
    }
    current.push(item);
  }
  flush();

  return lines;
}

export async function extractTextLayer(pdfBytes: Uint8Array): Promise<TextLayer> {
  // PDF.js detaches the ArrayBuffer it is handed. The caller still needs the
  // original bytes to send to Gemini when a page turns out to be scanned, so
  // hand PDF.js a copy rather than the buffer we were given.
  const { totalPages, items } = await extractTextItems(new Uint8Array(pdfBytes));

  const pages = items.map((pageItems, index) => {
    const positioned: PositionedItem[] = pageItems
      .filter((item) => item.str.trim().length > 0)
      .map((item) => ({
        str: item.str,
        x: item.x,
        y: item.y,
        width: item.width,
        fontSize: item.fontSize,
      }));

    const lines = groupIntoLines(positioned);
    return {
      pageNumber: index + 1,
      lines,
      charCount: lines.reduce((sum, line) => sum + line.text.length, 0),
    };
  });

  return { pages, pageCount: totalPages };
}
