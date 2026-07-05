from fastapi import APIRouter, File, HTTPException, UploadFile

from app.models.schemas import ErrorResponse, ParseResponse
from app.services.docling_service import parse_ocr_markdown, parse_pdf_bytes
from app.services.ocr_service import ocr_pdf_to_markdown
from app.services.pdf_utils import is_scanned_pdf
from app.utils.logging_config import logger

router = APIRouter()


@router.post("/parse", response_model=ParseResponse, responses={400: {"model": ErrorResponse}, 500: {"model": ErrorResponse}})
async def parse(file: UploadFile = File(...)) -> ParseResponse:
    if file.content_type not in ("application/pdf", "application/octet-stream", None):
        raise HTTPException(status_code=400, detail=f"Unsupported content type: {file.content_type}")

    pdf_bytes = await file.read()
    if not pdf_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    try:
        scanned = is_scanned_pdf(pdf_bytes)
    except Exception as exc:
        logger.error(f"Failed to inspect PDF: {exc}")
        raise HTTPException(status_code=400, detail=f"Could not read PDF: {exc}") from exc

    try:
        if scanned:
            logger.info(f"'{file.filename}' detected as scanned — running PaddleOCR before Docling")
            markdown_text = ocr_pdf_to_markdown(pdf_bytes)
            return parse_ocr_markdown(markdown_text)

        logger.info(f"'{file.filename}' detected as text-based — parsing directly with Docling")
        return parse_pdf_bytes(pdf_bytes)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Failed to parse '{file.filename}': {exc}")
        raise HTTPException(status_code=500, detail=f"Parsing failed: {exc}") from exc
