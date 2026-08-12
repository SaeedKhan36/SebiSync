import { describe, expect, it } from "vitest";
import { buildSections } from "./pdfSections";
import type { RawPage, TextLine } from "./pdfTextLayer";

// Every line below is shaped after real SEBI circular text. The recurring
// failure mode this guards against is over-eager heading detection: a clause
// wrongly promoted to a heading pollutes sectionPath (and therefore
// Obligation.citationSection) with a whole paragraph of prose.

const BODY_FONT = 10;
// Roughly a Letter page's text measure at 10pt. Line width is derived from
// character count so fixtures read naturally: a line long enough to fill the
// column is treated as wrapped, exactly as it would be in a real PDF.
const CHAR_WIDTH = 6;
const COLUMN_CHARS = 76;

// "text" | ["text", fontSize] | a fully specified line when width matters.
type LineSpec = string | [string, number] | TextLine;

function page(lines: LineSpec[], pageNumber = 1): RawPage {
  const parsed: TextLine[] = lines.map((line) => {
    if (typeof line === "object" && !Array.isArray(line)) return line;
    const [text, fontSize] = typeof line === "string" ? [line, BODY_FONT] : line;
    return { text, fontSize, width: Math.min(text.length, COLUMN_CHARS) * CHAR_WIDTH };
  });
  return {
    pageNumber,
    lines: parsed,
    charCount: parsed.reduce((sum, line) => sum + line.text.length, 0),
  };
}

function pathsOf(pages: ReturnType<typeof buildSections>): string[] {
  return pages.flatMap((p) => p.sections.map((s) => s.sectionPath));
}

describe("buildSections", () => {
  it("nests numbered clauses by their dot depth", () => {
    const [result] = buildSections([
      page([
        "3. Reporting Requirements",
        "3.1 Periodicity",
        "3.1.2 Every intermediary shall submit the report each quarter.",
      ]),
    ]);

    expect(result!.sections).toEqual([
      {
        sectionPath: "3. Reporting Requirements > 3.1 Periodicity > 3.1.2",
        text: "3.1.2 Every intermediary shall submit the report each quarter.",
      },
    ]);
  });

  it("truncates the stack when a shallower heading follows a deeper one", () => {
    const [result] = buildSections([
      page([
        "3. Reporting Requirements",
        "3.1.2 Every intermediary shall submit the report each quarter.",
        "4. Record Keeping",
        "Records shall be preserved for five years.",
      ]),
    ]);

    expect(pathsOf([result!])).toEqual([
      "3. Reporting Requirements > 3.1.2",
      "4. Record Keeping",
    ]);
  });

  it("does not treat a body line that merely starts with a figure as a heading", () => {
    const [result] = buildSections([
      page(["2. Applicability", "2019 amendments shall apply to all registered advisers."]),
    ]);

    expect(result!.sections).toEqual([
      {
        sectionPath: "2. Applicability",
        text: "2019 amendments shall apply to all registered advisers.",
      },
    ]);
  });

  it("keeps a substantive clause's text in the body, keyed by its bare number", () => {
    const [result] = buildSections([
      page(["5.1 The adviser shall conduct risk profiling of the client before onboarding."]),
    ]);

    // The sentence must survive verbatim — validateCitation matches quotes
    // against chunk text, so anything consumed into the path is unquotable.
    expect(result!.sections[0]).toEqual({
      sectionPath: "5.1",
      text: "5.1 The adviser shall conduct risk profiling of the client before onboarding.",
    });
  });

  it("recognises annexures and all-caps titles as top-level headings", () => {
    const [result] = buildSections([
      page([
        "MASTER CIRCULAR FOR INVESTMENT ADVISERS",
        "The provisions below take effect immediately.",
        "ANNEXURE A",
        "Format of the quarterly report.",
      ]),
    ]);

    expect(pathsOf([result!])).toEqual([
      "MASTER CIRCULAR FOR INVESTMENT ADVISERS",
      "ANNEXURE A",
    ]);
  });

  it("promotes a line set in a noticeably larger face", () => {
    const [result] = buildSections([
      page([["Scope and Objective", BODY_FONT * 1.4], "This circular applies to all intermediaries."]),
    ]);

    expect(result!.sections).toEqual([
      { sectionPath: "Scope and Objective", text: "This circular applies to all intermediaries." },
    ]);
  });

  it("falls back to Untitled before any heading is seen", () => {
    const [result] = buildSections([page(["Preamble text with no heading above it."])]);

    expect(result!.sections[0]!.sectionPath).toBe("Untitled");
  });

  it("carries the heading stack across a page break", () => {
    const result = buildSections([
      page(["6. Compliance", "The adviser shall maintain a register."], 1),
      page(["The register shall be produced on demand."], 2),
    ]);

    expect(result[1]!.sections[0]!.sectionPath).toBe("6. Compliance");
    expect(result[1]!.pageNumber).toBe(2);
  });

  // Real PDFs have no paragraphs, only physical lines. Every case below was
  // produced by running the parser over an actual generated circular; each one
  // was broken before joinWrappedLines existed.
  describe("wrapped lines", () => {
    it("reassembles a clause split across physical lines instead of reading line one as a title", () => {
      const [result] = buildSections([
        page([
          ["1. Applicability", 13],
          "1.1 This circular shall apply to all Investment Advisers registered with the",
          "Board under the SEBI (Investment Advisers) Regulations, 2013.",
        ]),
      ]);

      expect(result!.sections).toEqual([
        {
          sectionPath: "1. Applicability > 1.1",
          text: "1.1 This circular shall apply to all Investment Advisers registered with the Board under the SEBI (Investment Advisers) Regulations, 2013.",
        },
      ]);
    });

    it("keeps a continuation line that opens with a figure attached to its clause", () => {
      // "3.2 above." is the tail of the preceding sentence, not a new clause.
      const [result] = buildSections([
        page([
          ["ANNEXURE A", 14],
          "Format of the quarterly compliance report to be submitted under paragraph",
          "3.2 above.",
        ]),
      ]);

      expect(result!.sections).toEqual([
        {
          sectionPath: "ANNEXURE A",
          text: "Format of the quarterly compliance report to be submitted under paragraph 3.2 above.",
        },
      ]);
    });

    it("starts a new block after a line that closed a sentence", () => {
      const [result] = buildSections([
        page([
          "1.2 The provisions of this circular shall come into force with effect from",
          "April 1, 2026.",
          "2019 amendments shall continue to remain in force.",
        ]),
      ]);

      expect(result!.sections).toEqual([
        {
          sectionPath: "1.2",
          text: "1.2 The provisions of this circular shall come into force with effect from April 1, 2026. 2019 amendments shall continue to remain in force.",
        },
      ]);
    });

    it("refuses to read a full-measure line as a title even when it is short enough", () => {
      // 44 characters of remainder — under CLAUSE_TITLE_MAX_CHARS — but the
      // line fills the column, so it is wrapped prose, not a heading.
      const wrapped = "2.1 Every adviser shall conduct risk profiling";
      const [result] = buildSections([
        page([
          { text: wrapped, fontSize: BODY_FONT, width: COLUMN_CHARS * CHAR_WIDTH },
          { text: "of the client before onboarding.", fontSize: BODY_FONT, width: 100 },
        ]),
      ]);

      expect(result!.sections[0]).toEqual({
        sectionPath: "2.1",
        text: "2.1 Every adviser shall conduct risk profiling of the client before onboarding.",
      });
    });

    it("rejoins a word hyphenated across a line break", () => {
      const [result] = buildSections([
        page(["The adviser shall maintain a comprehensive regis-", "ter of all complaints."]),
      ]);

      expect(result!.sections[0]!.text).toBe(
        "The adviser shall maintain a comprehensive register of all complaints.",
      );
    });
  });

  it("ignores the font-size rule on OCR pages, which report no font metrics", () => {
    const [result] = buildSections([
      page([
        ["7. Fees", 0],
        ["The fee shall not exceed 2.5 per cent of assets under advice.", 0],
      ]),
    ]);

    expect(pathsOf([result!])).toEqual(["7. Fees"]);
  });
});
