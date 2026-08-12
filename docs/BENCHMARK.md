# Extraction accuracy benchmark

How well does the pipeline turn regulatory prose into machine-actionable obligations? This
document defines the measurement. It is deliberately separate from the results, because the
method should be arguable without reference to whether the numbers flatter us.

> **Status: method implemented, figures not yet produced.** The harness runs
> (`bun run benchmark`) and its scoring logic is unit-tested, but the ground-truth files in
> `apps/worker/src/scripts/groundTruth/` are still empty skeletons. Labelling is manual and
> unavoidable — see the "Producing the figures" section. **No accuracy figure should be
> quoted anywhere until this section carries real numbers.**

## What is being measured

For a labelled span of a circular, every obligation a careful human reads out of the text is
compared against every obligation the pipeline persisted.

| | |
|---|---|
| **True positive** | A labelled obligation the pipeline extracted |
| **False positive** | An obligation the pipeline extracted with no counterpart in the labels |
| **False negative** | A labelled obligation the pipeline did not extract |
| **Precision** | TP / (TP + FP) — of what it produced, how much was real |
| **Recall** | TP / (TP + FN) — of what was there, how much it found |
| **F1** | Harmonic mean of the two |

## Method

**Corpora.** Two SEBI master circulars, one per intermediary category the product targets:
Investment Advisers (IA) and Stock Brokers (STOCKBROKER). Naming the category and corpus is
a PS2 requirement, not decoration — an extractor tuned on one circular family tells you
little about another.

**Ground truth.** Hand-labelled, by a person reading the PDF, before looking at the model
output. Format and labelling procedure: `apps/worker/src/scripts/groundTruth/README.md`.

**Labelled span.** Only part of each circular is labelled, and it is labelled *exhaustively*.
This matters for precision: outside the labelled span a correct extraction has no label to
match and would be scored as a false positive. The benchmark therefore restricts the
precision denominator to obligations whose citation page falls inside `scopePages`. Recall is
unaffected by scoping.

**Matching rule.** An extracted obligation is credited against a label when their citation
quotes overlap by ≥ 0.6, one-to-one, assigned best-score-first
(`apps/worker/src/scripts/benchmarkMatch.ts`). Three choices worth defending:

- *Citation overlap, not title similarity.* Titles are model-generated prose and comparing
  them measures phrasing. The citation is the anchor to the source document, which is the
  thing that has to be right.
- *Overlap coefficient, not Jaccard.* The labeller marks the operative clause; the model may
  quote a sentence more or a sub-clause less. Jaccard would penalise a correct extraction
  purely for quoting extra context, so the score is against the shorter quote.
- *One-to-one.* One over-broad extraction spanning two labelled duties is credited once and
  the second duty counts as a miss. Anything else lets a single vague obligation absorb the
  whole chapter.

Both sides pass through the same typographic normaliser the extraction guard uses
(`agents/extraction/citationMatch.ts`), so a label copied verbatim from a PDF and a quote the
model tidied compare equal.

**Miss attribution.** A recall figure alone does not say what to fix, so every false negative
is attributed to a stage:

| Cause | Meaning | Where to fix it |
|---|---|---|
| `NOT_IN_PARSED_TEXT` | The clause never survived PDF parsing | `ingestion/pdfTextLayer.ts` (text layer), `pdfSections.ts` (heading/wrap detection), `chunker.ts` |
| `NOT_EXTRACTED` | Text was present; the model did not propose it | Extraction prompt |
| `DROPPED_BY_CITATION_GUARD` | Model proposed it but paraphrased the quote | Prompt (quote verbatim) |
| `DROPPED_BY_CLASSIFICATION` | No seeded `IntermediaryCategory` matched | `packages/db/prisma/seed.ts` |
| `FAILED_TO_PERSIST` | Database write error | Logs |

The last three are recovered from the run report `bun run ingest` writes to
`apps/worker/.runs/<documentId>.json`; without one, misses can still be split by whether the
clause survived parsing.

## Producing the figures

```bash
cd apps/worker && bun run ingest -- --file ./circulars/ia-master-circular.pdf --title "Master Circular for Investment Advisers" --circular "SEBI/HO/MIRSD/MIRSD-PoD-1/P/CIR/2024/50" --issued 2024-05-15 --url "https://www.sebi.gov.in/..."
```

Then label a chapter (`apps/worker/src/scripts/groundTruth/ia.json`) and score it:

```bash
cd apps/worker && bun run benchmark -- --ground-truth src/scripts/groundTruth/ia.json --document <documentId>
```

Repeat for the stockbroker corpus. Record below: corpus, document, labelled span, sample size,
the three figures, and the miss breakdown.

## Results

_Not yet produced — the ground-truth files are unlabelled. Fill this in from the benchmark
output, and quote nothing before then._

| Corpus | Circular | Labelled span | Labels | TP | FP | FN | Precision | Recall | F1 |
|---|---|---|---|---|---|---|---|---|---|
| IA | | | | | | | | | |
| STOCKBROKER | | | | | | | | | |

### Miss breakdown

| Corpus | Not in parsed text | Not extracted | Citation guard | Classification | Persist |
|---|---|---|---|---|---|
| IA | | | | | |
| STOCKBROKER | | | | | |

## Threats to validity

Worth stating plainly rather than discovering under questioning:

- **Single labeller.** No inter-annotator agreement was measured, so "what counts as one
  obligation" rests on one person's judgement. The `notes` field exists for the calls that
  were genuinely arguable.
- **Small sample.** One chapter per corpus. Enough to be indicative, not enough for a
  confidence interval.
- **The labeller is not a compliance officer.** A domain expert would draw some boundaries
  differently, particularly where a clause imposes several duties at once.
- **The matching threshold is hand-picked**, not fitted. It was chosen to be strict; moving
  it moves recall, and any quoted figure should state it.
