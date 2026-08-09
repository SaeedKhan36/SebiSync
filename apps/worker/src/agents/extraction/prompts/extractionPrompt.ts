import type { DocumentChunk } from "@sebi/db";

export interface CorpusContext {
  title: string;
  circularNumber: string;
  issuedDate: string;
}

const OUTPUT_SCHEMA_INSTRUCTIONS = `
Return JSON matching this shape exactly:
{
  "candidates": [
    {
      "code": string,                  // short stable id, e.g. "IA-RISK-PROFILING-01"
      "title": string,
      "description": string,
      "obligatedAction": string,
      "triggerEvent": string | null,
      "frequency": "PER_CLIENT" | "PER_EVENT" | "ANNUAL" | "ONE_TIME" | null,
      "deadlineDays": number | null,
      "deadlineBasis": string | null,
      "penaltyOrRisk": string | null,
      "citationText": string,          // EXACT verbatim substring copied from the chunk text below
      "citationPage": number | null,
      "citationSection": string | null,
      "extractionConfidence": number,  // 0 to 1
      "applicableCategoryCodes": string[], // CLOSED LIST — see below. e.g. ["IA"]
      "sourceChunkIndexes": number[]   // indexes of the chunks below that this obligation cites
    }
  ]
}

applicableCategoryCodes MUST be drawn only from this closed list — any other
value causes the obligation to be discarded downstream:
  "IA"          Investment Adviser
  "STOCKBROKER" Stockbroker / trading member
  "DEPOSITORY"  Depository or depository participant
  "AMC"         Asset management company / mutual fund
  "RTA"         Registrar and transfer agent
  "MII"         Market infrastructure institution (exchange, clearing corp)
Use the closest match; never invent a new code. If an obligation applies to
every intermediary, list every code that genuinely applies rather than
inventing an "ALL" value.`.trim();

const WORKED_EXAMPLES = `
Example 1 (standing, per-client obligation):
{
  "code": "IA-RISK-PROFILING-01",
  "title": "Mandatory Risk Profiling Before Advice",
  "description": "Investment Advisers must carry out risk profiling and suitability assessment of the client before providing any investment advisory services, and maintain records of the same.",
  "obligatedAction": "Carry out risk profiling and suitability assessment; maintain records.",
  "triggerEvent": "client onboarding / before advice is given",
  "frequency": "PER_CLIENT",
  "deadlineDays": null,
  "deadlineBasis": null,
  "penaltyOrRisk": null,
  "citationText": "<exact quote from the source chunk>",
  "applicableCategoryCodes": ["IA"]
}

Example 2 (time-boxed, per-event obligation):
{
  "code": "IA-GRIEVANCE-SCORES-01",
  "title": "SCORES Grievance Redressal Within 21 Days",
  "description": "Investment Advisers must resolve client complaints and upload the Action Taken Report on SCORES within 21 calendar days of receipt of the complaint.",
  "obligatedAction": "Resolve complaint and upload ATR on SCORES.",
  "triggerEvent": "complaint received via SCORES",
  "frequency": "PER_EVENT",
  "deadlineDays": 21,
  "deadlineBasis": "from date of complaint receipt",
  "penaltyOrRisk": null,
  "citationText": "<exact quote from the source chunk>",
  "applicableCategoryCodes": ["IA"]
}`.trim();

export function buildExtractionPrompt(chunks: DocumentChunk[], corpusContext: CorpusContext): string {
  const chunkList = chunks
    .map(
      (chunk, i) =>
        `[chunk ${i}] (page ${chunk.pageNumber ?? "?"}, section "${chunk.sectionPath ?? "?"}")\n${chunk.text}`,
    )
    .join("\n\n");

  return `
You are a regulatory compliance analyst extracting machine-actionable obligations from a SEBI
circular for Investment Adviser intermediaries. Your job is to identify every distinct, concrete
obligation in the text below and express it as structured JSON.

Corpus context:
- Title: ${corpusContext.title}
- Circular number: ${corpusContext.circularNumber}
- Issued date: ${corpusContext.issuedDate}

Chunk text:
${chunkList}

${OUTPUT_SCHEMA_INSTRUCTIONS}

Worked examples of the two obligation shapes we care about most:
${WORKED_EXAMPLES}

Critical instruction: citationText MUST be an exact verbatim substring copied character-for-character
from the chunk text above — do not paraphrase, summarize, or alter punctuation/whitespace. If a
sentence spans multiple chunks, quote only the portion from a single chunk and cite that chunk's index.
If no genuine obligations are present in this text, return an empty candidates array.
`.trim();
}
