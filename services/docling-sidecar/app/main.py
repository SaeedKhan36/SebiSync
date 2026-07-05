from fastapi import FastAPI
from fastapi.responses import JSONResponse
from starlette.requests import Request

from app.routes.health import router as health_router
from app.routes.parse import router as parse_router
from app.utils.logging_config import logger

app = FastAPI(
    title="SEBI Compliance Platform — Docling Sidecar",
    description="Converts uploaded PDFs into structured JSON (headings, sections, tables, lists, markdown). No AI/DB/business logic — parsing only.",
    version="0.1.0",
)

app.include_router(health_router)
app.include_router(parse_router)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error(f"Unhandled error on {request.method} {request.url.path}: {exc}")
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})
