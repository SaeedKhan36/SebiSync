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

The `@sebi/worker` backend talks to this service over HTTP via
`DOCLING_SIDECAR_URL` in `apps/worker/.env`. The correct value depends on
**where the backend process itself is running** relative to the sidecar:

| Scenario | `apps/worker/.env` → `DOCLING_SIDECAR_URL` |
|---|---|
| Backend runs natively (`pnpm dev`), sidecar runs in Docker (via `docker compose up` below, which publishes the container's port to the host) | `http://localhost:8000` — **unchanged from today**, since the container's port is mapped straight through to `localhost` on the host |
| Backend *also* containerized on the same Docker Compose network as the sidecar (not set up in this repo yet — the sidecar's `docker-compose.yml` only defines the sidecar itself) | `http://docling-sidecar:8000` — Docker's internal DNS resolves the service name `docling-sidecar` (as defined in `docker-compose.yml`) to the container's IP; `localhost` would instead point at the backend's *own* container and fail to connect |

No new environment variables are introduced by dockerizing this service —
`PORT` is the only variable either the app or the container image reads, and
it already existed in `.env.example`.

The worker calls `POST ${DOCLING_SIDECAR_URL}/parse` with the PDF as
multipart form data and consumes the structured JSON response to build its
own chunking/embedding pipeline. Because this service only exposes a clean
HTTP contract (`/parse`, `/health`) with no shared code or database, it's
independently deployable and can be swapped for a different implementation
later without touching the TypeScript backend, as long as the response shape
above is preserved.

## Docker

### One-command startup

```bash
cp .env.example .env   # only needed once; PORT=8000 by default
docker compose up --build
```

This builds the image and starts the container with a health check attached
(`GET /health` every 30s). Add `-d` to run in the background. Stop it with
`docker compose down`.

### Manual build/run (equivalent, without Compose)

```bash
docker build -t docling-sidecar .
docker run -p 8000:8000 --env-file .env --name docling-sidecar docling-sidecar
```

### Verifying it works

```bash
# Health check
curl http://localhost:8000/health
# → {"status":"ok"}

# Parse a real PDF
curl -X POST http://localhost:8000/parse -F "file=@/path/to/document.pdf"
```

### Notes on what's inside the image

- Base image: `python:3.11-slim-bookworm` (pinned, not just `slim`, so the
  base doesn't silently drift between builds).
- `libgl1`/`libglib2.0-0` are installed because `opencv-python`, a transitive
  dependency of `paddleocr`/`paddlepaddle`, needs them at import time even
  though we never touch a display.
- Docling and PaddleOCR download their model weights on first use (cached
  under the container user's home directory, `~/.cache` and
  `~/.paddlex/official_models/`). The first `/parse` call after a fresh
  container start will be noticeably slower than subsequent calls while
  these download; this is normal, not a hang. Mount a volume at
  `/home/appuser/.cache` and `/home/appuser/.paddlex` if you want model
  weights to persist across container restarts instead of re-downloading.
- Runs as a non-root user (`appuser`) inside the container.
- `requirements.txt` is unchanged from the already-verified local venv setup
  (same exact `docling==2.69.1`, `paddleocr==3.7.0`, `paddlepaddle==3.3.1`,
  etc. that were confirmed working against a real PDF earlier) — no backend
  code changes were needed for containerization.
