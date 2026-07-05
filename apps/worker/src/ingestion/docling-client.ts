import { downloadObject } from "../storage/r2";

export interface DoclingParseResult {
  pages: Array<{
    pageNumber: number;
    sections: Array<{ sectionPath: string; text: string }>;
  }>;
  fullText: string;
  ocrUsed: boolean;
}

interface DoclingSidecarSection {
  section_path: string;
  text: string;
  page_number: number | null;
}

interface DoclingSidecarPage {
  page_number: number;
  sections: DoclingSidecarSection[];
}

interface DoclingSidecarResponse {
  pages: DoclingSidecarPage[];
  full_text: string;
  ocr_used: boolean;
}

// Calls the Python Docling sidecar (services/docling-sidecar). The worker
// downloads the PDF from R2 and posts it as multipart/form-data to the
// sidecar's /parse endpoint, then maps its snake_case response onto the
// camelCase shape the rest of the ingestion pipeline expects.
export async function parseDocument(document: { r2ObjectKey: string }): Promise<DoclingParseResult> {
  const pdfBytes = await downloadObject(document.r2ObjectKey);
  const sidecarUrl = process.env.DOCLING_SIDECAR_URL ?? "http://localhost:8000";

  const formData = new FormData();
  const fileName = document.r2ObjectKey.split("/").pop() ?? "document.pdf";
  formData.append("file", new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" }), fileName);

  const response = await fetch(`${sidecarUrl}/parse`, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    throw new Error(`Docling sidecar returned ${response.status}: ${await response.text()}`);
  }

  const raw = (await response.json()) as DoclingSidecarResponse;
  return {
    pages: raw.pages.map((page) => ({
      pageNumber: page.page_number,
      sections: page.sections.map((section) => ({
        sectionPath: section.section_path,
        text: section.text,
      })),
    })),
    fullText: raw.full_text,
    ocrUsed: raw.ocr_used,
  };
}
