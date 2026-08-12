import type { RawPage, TextLine } from "./pdfTextLayer";

// Rebuilds the section structure the Python sidecar got from Docling. Only
// `sectionPath` is reconstructed — headings/tables/lists were already thrown
// away by the old docling-client.ts before anything downstream saw them.
//
// The path *format* deliberately matches the sidecar — " > " join, "Untitled"
// fallback, level-N truncation — so existing Obligation.citationSection values
// stay comparable across the migration. The labels themselves differ: Docling
// emitted heading text, whereas a substantive clause here is keyed by its
// number ("3.1") so the clause's own sentence stays quotable in the body.
// See services/docling-sidecar/app/services/docling_service.py:103,123.

export interface Section {
  sectionPath: string;
  text: string;
}

export interface SectionedPage {
  pageNumber: number;
  sections: Section[];
}

const PATH_SEPARATOR = " > ";
const UNTITLED = "Untitled";

// Upper bound for a heading that already carries a strong independent signal
// (all-caps, a structural keyword, or an outsized face).
const TITLE_MAX_CHARS = 80;

// A numbered clause whose remainder is at most this long, and which does not
// read as a full sentence, is a section title in its own right ("3. Reporting
// Requirements"). Anything longer is a substantive clause: it still opens a
// section keyed by its number, but its text stays in the body where citation
// matching needs it.
//
// This bound is deliberately tighter than TITLE_MAX_CHARS. The distinguishing
// feature of a heading in a real PDF is that it is short relative to the text
// column, whereas the first line of a wrapped clause runs the full width — at
// 80 chars the two are indistinguishable and every wrapped clause's opening
// line was being promoted to a title.
const CLAUSE_TITLE_MAX_CHARS = 48;

// Headings set in a noticeably larger face than the body text.
const HEADING_FONT_RATIO = 1.15;

const STRUCTURAL_HEADING =
  /^(ANNEXURE|ANNEX|SCHEDULE|APPENDIX|PART\s+[IVXLC]+|CHAPTER\s+\d+|SECTION\s+[IVXLC\d]+)\b/i;

// Clause numbering: "3.", "3)", "3.1", "3.1.2 ". Two guards keep prose out:
// every segment is at most two digits, and a single-segment number must carry
// an explicit "." or ")" separator. Together these reject body lines that
// merely open with a figure — "2019 amendments shall apply..." matches neither.
const CLAUSE_PREFIX = /^(\d{1,2}(?:\.\d{1,2})*)([.)]?)\s+(\S.*)$/;

interface Clause {
  /** The number as printed, separator included: "3.", "3.1", "4)". */
  label: string;
  level: number;
  rest: string;
}

function parseClause(text: string): Clause | null {
  const match = CLAUSE_PREFIX.exec(text);
  if (!match) return null;

  const [, number, separator, rest] = match;
  if (!number || rest === undefined) return null;

  const segments = number.split(".");
  if (segments.length === 1 && separator === "") return null;

  return { label: `${number}${separator ?? ""}`, level: segments.length, rest };
}

function isAllCapsTitle(text: string): boolean {
  if (text.length > TITLE_MAX_CHARS) return false;
  if (/[.;:]$/.test(text)) return false;
  if (!/[A-Z]/.test(text)) return false;
  return text === text.toUpperCase();
}

// Weighted by character count rather than by line, because body text dominates
// a document by volume while headings dominate by count. A plain per-line
// median is dragged upward by a page of short headings above a few long
// paragraphs, which then suppresses the font-size rule entirely.
//
// Returns 0 when no line carries font metrics — OCR pages report fontSize 0,
// and callers treat 0 as "no signal" rather than inventing a threshold.
function bodyFontSize(pages: RawPage[]): number {
  const weighted = pages
    .flatMap((page) => page.lines)
    .filter((line) => line.fontSize > 0 && line.text.length > 0)
    .map((line) => ({ size: line.fontSize, weight: line.text.length }))
    .sort((a, b) => a.size - b.size);

  const totalWeight = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  if (totalWeight === 0) return 0;

  let seen = 0;
  for (const entry of weighted) {
    seen += entry.weight;
    if (seen * 2 >= totalWeight) return entry.size;
  }
  return weighted[weighted.length - 1]?.size ?? 0;
}

// A line occupying at least this share of the text column is running the full
// measure, which means it wrapped — it cannot be a heading, whatever its
// character count says.
const FULL_MEASURE_RATIO = 0.9;

interface Classified {
  /** 1-based depth in the heading stack. */
  level: number;
  /** The path segment this heading contributes. */
  label: string;
  /** Text left over for the body, if the heading line also carries content. */
  body: string;
}

/** Page geometry and typography shared across every classification decision. */
interface Metrics {
  baseFontSize: number;
  columnWidth: number;
}

function isFullMeasure(line: TextLine, { columnWidth }: Metrics): boolean {
  if (columnWidth <= 0 || line.width <= 0) return false;
  return line.width >= columnWidth * FULL_MEASURE_RATIO;
}

function classify(line: TextLine, metrics: Metrics): Classified | null {
  const text = line.text;

  if (STRUCTURAL_HEADING.test(text) && text.length <= TITLE_MAX_CHARS * 2) {
    return { level: 1, label: text, body: "" };
  }

  const clause = parseClause(text);
  if (clause) {
    // A short remainder with no sentence-ending punctuation is a title; a long
    // one is a substantive clause, so key the section on the bare number and
    // let the sentence itself flow into the body. A line that fills the column
    // is wrapped prose regardless of length, so it is never a title.
    const isTitle =
      clause.rest.length <= CLAUSE_TITLE_MAX_CHARS &&
      !/[.;:]$/.test(clause.rest) &&
      !isFullMeasure(line, metrics);
    return isTitle
      ? { level: clause.level, label: `${clause.label} ${clause.rest}`, body: "" }
      : { level: clause.level, label: clause.label, body: text };
  }

  if (isAllCapsTitle(text)) {
    return { level: 1, label: text, body: "" };
  }

  const { baseFontSize } = metrics;
  if (
    baseFontSize > 0 &&
    line.fontSize > baseFontSize * HEADING_FONT_RATIO &&
    text.length <= TITLE_MAX_CHARS
  ) {
    return { level: 1, label: text, body: "" };
  }

  return null;
}

/** A heading that carries no body text of its own, and so never absorbs the next line. */
function isStandaloneHeading(line: TextLine, metrics: Metrics): boolean {
  const heading = classify(line, metrics);
  return heading !== null && heading.body === "";
}

// The text column, taken as the widest line in the document. Headings, short
// last-lines of paragraphs and centred titles all fall short of it; wrapped
// body lines reach it.
function measureColumnWidth(pages: RawPage[]): number {
  let widest = 0;
  for (const page of pages) {
    for (const line of page.lines) {
      if (line.width > widest) widest = line.width;
    }
  }
  return widest;
}

// A PDF has no concept of a paragraph — it has physical lines, and a clause
// routinely wraps across several of them. Classifying those lines individually
// is wrong in both directions: the opening line of a wrapped clause looks like
// a short title, and a continuation line reading "3.2 above." looks like a new
// clause. So rebuild logical blocks first, then classify the blocks.
//
// A line continues the previous one unless something positively marks a break:
// a change of font size, a previous line that closed a sentence, or a previous
// line that was a heading in its own right. Ordering matters — continuation
// wins over the clause-number test, which is what keeps "…under paragraph" and
// "3.2 above." together.
function joinWrappedLines(lines: TextLine[], metrics: Metrics): TextLine[] {
  const blocks: TextLine[] = [];
  let previous: TextLine | undefined;

  for (const line of lines) {
    const isContinuation =
      previous !== undefined &&
      Math.abs(line.fontSize - previous.fontSize) < 0.5 &&
      !/[.:;?!]$/.test(previous.text) &&
      !isStandaloneHeading(previous, metrics) &&
      !isStandaloneHeading(line, metrics);

    if (isContinuation) {
      const block = blocks[blocks.length - 1]!;
      // A word broken across the line break is rejoined without its hyphen.
      block.text = /[A-Za-z]-$/.test(block.text)
        ? block.text.slice(0, -1) + line.text
        : `${block.text} ${line.text}`;
      block.fontSize = Math.max(block.fontSize, line.fontSize);
      block.width = Math.max(block.width, line.width);
    } else {
      blocks.push({ text: line.text, fontSize: line.fontSize, width: line.width });
    }

    previous = line;
  }

  return blocks;
}

export function buildSections(pages: RawPage[]): SectionedPage[] {
  const metrics: Metrics = {
    baseFontSize: bodyFontSize(pages),
    columnWidth: measureColumnWidth(pages),
  };
  const stack: string[] = [];

  return pages.map((page) => {
    const sections: Section[] = [];
    let currentPath: string | null = null;
    let buffer: string[] = [];

    const flush = () => {
      const text = buffer.join(" ").trim();
      if (text) sections.push({ sectionPath: currentPath ?? UNTITLED, text });
      buffer = [];
    };

    for (const line of joinWrappedLines(page.lines, metrics)) {
      const heading = classify(line, metrics);

      if (heading) {
        flush();
        // Same truncation rule as the sidecar: a level-N heading replaces
        // everything from depth N down.
        stack.splice(heading.level - 1, stack.length, heading.label);
        currentPath = stack.join(PATH_SEPARATOR);
        if (heading.body) buffer.push(heading.body);
        continue;
      }

      if (currentPath === null) currentPath = stack.join(PATH_SEPARATOR) || UNTITLED;
      buffer.push(line.text);
    }

    flush();
    return { pageNumber: page.pageNumber, sections };
  });
}
