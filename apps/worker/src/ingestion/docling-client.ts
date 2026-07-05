import { getPresignedDownloadUrl } from "../storage/r2";

export interface DoclingParseResult {
  pages: Array<{
    pageNumber: number;
    sections: Array<{ sectionPath: string; text: string }>;
  }>;
  fullText: string;
  ocrUsed: boolean;
}

// Calls the Python Docling sidecar (out of scope to build here). Contract:
// the worker generates a presigned GET URL for the R2 object and the sidecar
// fetches the file directly, avoiding proxying large PDFs through the worker.
export async function parseDocument(document: { r2ObjectKey: string }): Promise<DoclingParseResult> {
  const presignedUrl = await getPresignedDownloadUrl(document.r2ObjectKey);
  const sidecarUrl = process.env.DOCLING_SIDECAR_URL ?? "http://localhost:8000";

  const response = await fetch(`${sidecarUrl}/parse`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ r2ObjectKey: document.r2ObjectKey, presignedUrl }),
  });
  if (!response.ok) {
    throw new Error(`Docling sidecar returned ${response.status}: ${await response.text()}`);
  }
  return response.json() as Promise<DoclingParseResult>;
}
