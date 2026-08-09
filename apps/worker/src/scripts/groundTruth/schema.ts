import { z } from "zod";

// Shape of a hand-labelled ground-truth file. Validated on load rather than
// trusted: these files are written by hand under time pressure, and a typo'd
// key that silently reads as `undefined` would quietly deflate recall and make
// the extraction look worse than it is.

export const groundTruthEntrySchema = z.object({
  // Stable label id, e.g. "gt-ia-001". Only used to report which entries were
  // missed, so it needs to be greppable in the source file — nothing more.
  id: z.string().min(1),
  title: z.string().min(1),
  // The circular's own numbering, e.g. "3.2.1". Reported alongside misses so a
  // labeller can find the clause again without re-reading the chapter.
  section: z.string().min(1),
  // The verbatim clause, copied from the PDF. This is what matching is done
  // on — see benchmarkExtraction.ts for why citation overlap rather than
  // title similarity is the right key.
  citationText: z.string().min(20),
  citationPage: z.number().int().positive().nullable(),
  applicableCategoryCodes: z.array(z.string().min(1)).min(1),
  notes: z.string().optional(),
});
export type GroundTruthEntry = z.infer<typeof groundTruthEntrySchema>;

export const groundTruthFileSchema = z.object({
  corpus: z.string().min(1),
  documentTitle: z.string().min(1),
  circularNumber: z.string().min(1),
  sourceUrl: z.string().url(),
  // Which part of the circular was exhaustively labelled, in prose. Precision
  // is only interpretable against an exhaustively-labelled span: outside it,
  // a correct extraction has no label to match and would be scored as a false
  // positive.
  scope: z.string().min(1),
  // Page range of that span. Obligations cited outside it are excluded from
  // the precision denominator. Omit only if the whole document was labelled.
  scopePages: z
    .object({ fromPage: z.number().int().positive(), toPage: z.number().int().positive() })
    .nullable(),
  labelledBy: z.string().min(1),
  labelledAt: z.string().min(1),
  entries: z.array(groundTruthEntrySchema),
});
export type GroundTruthFile = z.infer<typeof groundTruthFileSchema>;
