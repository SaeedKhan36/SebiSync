// Pure text-matching logic for the hallucination guard, split out from the
// validateCitation graph node so it can be tested without a graph or a
// database (same pattern as services/gapRules.ts).
//
// The guard's job is to prove that an obligation's quoted clause really
// appears in the source PDF. The naive version of that — exact substring
// match after collapsing whitespace — is too strict against real SEBI
// circulars: Docling faithfully preserves typographic artefacts that the LLM
// silently cleans up when it quotes. A model that correctly quotes
// "non‑individual" as "non-individual" (non-breaking hyphen vs ASCII) was
// being dropped as a hallucination.
//
// So we normalise *typography*, never *wording*. There is deliberately no
// fuzzy/edit-distance fallback: the whole trust story is that the quote
// genuinely occurs in the source, and a similarity threshold would quietly
// trade that away. Every relaxation below is a lossless rendering of the same
// characters, and the match mode is reported so the loosening stays visible.

export type CitationMatchMode = "EXACT" | "NORMALIZED";

const SOFT_HYPHEN = /­/g;
// Zero-width space / non-joiner / joiner / BOM — invisible, and Docling emits
// them at line-break points in justified text.
const ZERO_WIDTH = /[​-‍﻿]/g;
const SINGLE_QUOTES = /[‘’‚‛′]/g;
const DOUBLE_QUOTES = /[“”„‟″]/g;
// En dash, em dash, figure/en-quad variants, non-breaking hyphen, minus sign.
const DASHES = /[‐-―−]/g;
// A hyphen the typesetter inserted to break a word across lines: the hyphen
// itself is not part of the word ("intermedi-\nary" is one word). Must run
// while the newline is still present, i.e. before whitespace collapsing.
const HYPHEN_LINEBREAK = /-[ \t]*[\r\n]+[ \t]*/g;

export function normalize(text: string): string {
  return text
    .normalize("NFKC") // ligatures (ﬁ), full-width forms, ellipsis → plain ASCII equivalents
    .replace(SOFT_HYPHEN, "")
    .replace(ZERO_WIDTH, "")
    .replace(SINGLE_QUOTES, "'")
    .replace(DOUBLE_QUOTES, '"')
    .replace(DASHES, "-")
    .replace(HYPHEN_LINEBREAK, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

// Returns how the citation was found, or null if it isn't in any source chunk.
// EXACT means it survived the strictest reading (whitespace-collapsed only);
// NORMALIZED means it only matched once typographic artefacts were folded.
// Callers report the split so a sudden swing towards NORMALIZED — which would
// suggest the normaliser is doing more work than it should — is visible
// rather than buried.
export function matchCitation(citationText: string, chunkTexts: string[]): CitationMatchMode | null {
  const strictCitation = collapseWhitespace(citationText);
  if (chunkTexts.some((text) => collapseWhitespace(text).includes(strictCitation))) {
    return "EXACT";
  }

  const normalizedCitation = normalize(citationText);
  if (chunkTexts.some((text) => normalize(text).includes(normalizedCitation))) {
    return "NORMALIZED";
  }

  return null;
}

// The original guard's notion of "verbatim": identical but for run-lengths of
// whitespace and letter case. Kept as its own step so EXACT keeps meaning
// exactly what it meant before the normaliser existed.
function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}
