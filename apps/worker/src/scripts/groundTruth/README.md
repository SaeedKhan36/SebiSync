# Ground truth for extraction accuracy

These files are the reference the extraction pipeline is scored against. Everything
`bun run benchmark` reports — precision, recall, F1 — rests on them, so they are worth
labelling carefully and slowly.

They are **not** generated. A ground-truth file written by the same model whose output it
scores measures nothing.

## Format

One file per corpus, validated by `schema.ts` on load. See that file for field-by-field
notes. Skeletons with the metadata already filled in are in `ia.json` and
`stockbroker.json`; both start with `entries: []`.

```jsonc
{
  "corpus": "IA",
  "documentTitle": "Master Circular for Investment Advisers",
  "circularNumber": "SEBI/HO/MIRSD/MIRSD-PoD-1/P/CIR/2024/50",
  "sourceUrl": "https://www.sebi.gov.in/...",
  "scope": "Chapter 3 (Obligations of Investment Advisers), paragraphs 3.1-3.9",
  "scopePages": { "fromPage": 14, "toPage": 22 },
  "labelledBy": "your name",
  "labelledAt": "2026-08-09",
  "entries": [
    {
      "id": "gt-ia-001",
      "title": "Risk profiling before advice",
      "section": "3.2.1",
      "citationText": "The investment adviser shall conduct a risk profiling of the client before providing investment advice.",
      "citationPage": 15,
      "applicableCategoryCodes": ["IA"],
      "notes": "Optional. Use for judgement calls a second labeller would query."
    }
  ]
}
```

## How to label

1. **Pick a span and label it exhaustively.** One substantial chapter is enough — aim for
   30–40 obligations. Exhaustive matters more than large: precision counts an extracted
   obligation with no matching label as a false positive, so a half-labelled chapter
   reports a false precision figure. Record the span in `scope` and `scopePages`.

2. **One entry per distinct obligation**, not per sentence. A clause imposing two separate
   duties ("shall record ... and shall retain for five years") is two entries if they could
   be complied with independently, one if they cannot.

3. **Copy `citationText` verbatim from the PDF.** Do not tidy the typography — the
   benchmark matches obligations by citation overlap, and the same normaliser used by the
   extraction guard (`agents/extraction/citationMatch.ts`) is applied to both sides. Keep
   the quote to the operative clause; a whole-page quote overlaps everything and matches
   the wrong obligation.

4. **Label what the circular says, not what you expect the model to find.** Including only
   the easy obligations inflates recall and defeats the purpose.

## Running the benchmark

```bash
cd apps/worker && bun run benchmark -- --ground-truth src/scripts/groundTruth/ia.json --document <documentId>
```

`--document` is the `RegulatoryDocument` id printed by `bun run ingest`. If that ingest run
also wrote a run report (`apps/worker/.runs/<id>.json`), the benchmark uses it to attribute
each miss to the stage that dropped it, rather than reporting an undifferentiated "not
found".
