import { describe, expect, it } from "vitest";
import { matchCitation, normalize } from "./citationMatch";

// Each artefact below was chosen because Docling actually emits it from SEBI
// circular PDFs, and each one used to cause a CORRECT obligation to be
// discarded as a hallucination.
describe("matchCitation", () => {
  it("reports EXACT when the quote is verbatim", () => {
    const chunk = "The investment adviser shall conduct risk profiling of the client.";
    expect(matchCitation("shall conduct risk profiling", [chunk])).toBe("EXACT");
  });

  it("treats whitespace runs and case as exact, matching the original guard", () => {
    const chunk = "The   investment\n  adviser SHALL conduct risk profiling.";
    expect(matchCitation("The investment adviser shall conduct", [chunk])).toBe("EXACT");
  });

  it("returns null when the quote simply is not there", () => {
    const chunk = "The investment adviser shall conduct risk profiling of the client.";
    expect(matchCitation("shall maintain a written complaints register", [chunk])).toBeNull();
  });

  it("searches every claimed source chunk, not just the first", () => {
    const chunks = ["Irrelevant preamble.", "The adviser shall maintain records for five years."];
    expect(matchCitation("maintain records for five years", chunks)).toBe("EXACT");
  });

  it("returns null when there are no source chunks at all", () => {
    expect(matchCitation("anything", [])).toBeNull();
  });

  describe("NORMALIZED matches (typographic artefacts only)", () => {
    it("folds curly quotes and apostrophes to ASCII", () => {
      const chunk = "the client’s “risk profile” shall be reviewed";
      expect(matchCitation(`the client's "risk profile" shall be reviewed`, [chunk])).toBe(
        "NORMALIZED",
      );
    });

    it("folds en/em dashes and non-breaking hyphens to ASCII hyphen", () => {
      const chunk = "non‑individual clients — including bodies corporate – shall";
      expect(
        matchCitation("non-individual clients - including bodies corporate - shall", [chunk]),
      ).toBe("NORMALIZED");
    });

    it("strips soft hyphens", () => {
      const chunk = "the inter­mediary shall record";
      expect(matchCitation("the intermediary shall record", [chunk])).toBe("NORMALIZED");
    });

    it("strips zero-width characters emitted at justified line breaks", () => {
      const chunk = "risk​profiling shall be‌ documented";
      expect(matchCitation("riskprofiling shall be documented", [chunk])).toBe("NORMALIZED");
    });

    it("rejoins a word hyphenated across a line break", () => {
      const chunk = "the intermedi-\nary shall furnish the report";
      expect(matchCitation("the intermediary shall furnish the report", [chunk])).toBe("NORMALIZED");
    });

    it("resolves ligatures via NFKC", () => {
      const chunk = "the adviser shall conﬁrm the suﬃciency of records";
      expect(matchCitation("shall confirm the sufficiency of records", [chunk])).toBe("NORMALIZED");
    });
  });

  // The guard is a trust boundary, so normalisation must never rewrite words.
  describe("does not relax into fuzzy matching", () => {
    it("still rejects a quote with a changed word", () => {
      const chunk = "The adviser shall conduct risk profiling annually.";
      expect(matchCitation("The adviser shall conduct risk profiling quarterly.", [chunk])).toBeNull();
    });

    it("still rejects a quote with an inserted negation", () => {
      const chunk = "The adviser shall disclose all conflicts of interest.";
      expect(matchCitation("The adviser shall not disclose all conflicts of interest.", [chunk])).toBeNull();
    });

    it("still rejects a paraphrase that shares most words", () => {
      const chunk = "The investment adviser shall conduct risk profiling of the client.";
      expect(matchCitation("The investment adviser conducts client risk profiling.", [chunk])).toBeNull();
    });

    it("keeps a real hyphen that is not at a line break", () => {
      // "risk-profiling" and "riskprofiling" are different strings, and the
      // linebreak rule must not collapse the first into the second.
      expect(normalize("risk-profiling")).toBe("risk-profiling");
    });
  });
});
