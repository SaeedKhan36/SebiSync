# Docling Sidecar

A standalone FastAPI service that converts uploaded PDFs into structured JSON
(headings, sections, tables, lists, page numbers, Markdown). It has exactly
one responsibility: PDF → structured JSON. No AI, no embeddings, no database,
no auth, no business logic — that all lives in the `@sebi/worker` TypeScript
backend, which calls this service over HTTP.

## Project structure

```
app/
  main.py              FastAPI app entrypoint
  routes/
    health.py          GET /health
    parse.py           POST /parse
  services/
    docling_service.py  Docling parsing + structure extraction
    ocr_service.py       PaddleOCR fallback for scanned PDFs
    pdf_utils.py         text-based vs. scanned PDF detection
  models/
    schemas.py           Pydantic request/response models
  utils/
    logging_config.py    structured logging setup
```

## Setup

### 1. Create a virtual environment

```bash
cd services/docling-sidecar
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure environment

```bash
cp .env.example .env
```

`.env` contains one variable:

```
PORT=8000
```

If `PORT` isn't set, the service defaults to `8000`.

### 4. Run locally

```bash
uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
```

Or, with the venv active and `.env` loaded into your shell:

```bash
export $(cat .env | xargs) && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
```

## Testing

### Health check

```bash
curl http://localhost:8000/health
```

Expected:

```json
{ "status": "ok" }
```

### Parse a PDF

`/parse` accepts a PDF via `multipart/form-data` under the `file` field:

```bash
curl -X POST http://localhost:8000/parse \
  -F "file=@/path/to/document.pdf"
```

Or in Postman: method `POST`, URL `http://localhost:8000/parse`, Body →
`form-data`, key `file`, type `File`, value = your PDF.

The response is JSON shaped like:

```json
{
  "metadata": { "title": "...", "page_count": 12, "ocr_used": false },
  "pages": [
    { "page_number": 1, "sections": [{ "section_path": "1. Introduction", "text": "...", "page_number": 1 }] }
  ],
  "headings": [{ "level": 1, "text": "1. Introduction", "page_number": 1 }],
  "tables": [{ "page_number": 3, "caption": "...", "rows": [["..."]] }],
  "lists": [{ "page_number": 2, "items": ["..."], "ordered": false }],
  "full_text": "...",
  "markdown": "...",
  "ocr_used": false
}
```

If the uploaded PDF has little-to-no selectable text (i.e. it's a scanned
image), the service automatically runs PaddleOCR over every page first, then
feeds the recognized text through Docling for structuring — `ocr_used` will
be `true` in the response.

## Configuration for the TypeScript backend

The `@sebi/worker` backend talks to this service over HTTP. In
`apps/worker/.env`, set:

```
DOCLING_SIDECAR_URL=http://localhost:8000
```

(Point this at wherever the sidecar is actually deployed in production —
e.g. a Railway/Fly/Cloud Run URL.)

The worker calls `POST ${DOCLING_SIDECAR_URL}/parse` with the PDF as
multipart form data and consumes the structured JSON response to build its
own chunking/embedding pipeline. Because this service only exposes a clean
HTTP contract (`/parse`, `/health`) with no shared code or database, it's
independently deployable and can be swapped for a different implementation
later without touching the TypeScript backend, as long as the response shape
above is preserved.

## Docker

```bash
docker build -t docling-sidecar .
docker run -p 8000:8000 --env-file .env docling-sidecar
```
