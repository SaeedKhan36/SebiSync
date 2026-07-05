"""PaddleOCR fallback for scanned/image-based PDFs.

Renders each page to an image and runs PaddleOCR over it, then reassembles
the recognized text into a page-tagged Markdown document that Docling can
subsequently parse for structure (headings/sections), same as it would for
a native text PDF.
"""

import io
from typing import Optional

import fitz  # PyMuPDF
import numpy as np
from paddleocr import PaddleOCR
from PIL import Image

from app.utils.logging_config import logger

_ocr_engine: Optional[PaddleOCR] = None


def _get_ocr_engine() -> PaddleOCR:
    global _ocr_engine
    if _ocr_engine is None:
        logger.info("Initializing PaddleOCR engine (first use, may take a moment)")
        _ocr_engine = PaddleOCR(use_angle_cls=True, lang="en", show_log=False)
    return _ocr_engine


def _render_page_to_image(page: fitz.Page, zoom: float = 2.0) -> Image.Image:
    matrix = fitz.Matrix(zoom, zoom)
    pixmap = page.get_pixmap(matrix=matrix)
    return Image.open(io.BytesIO(pixmap.tobytes("png")))


def ocr_pdf_to_markdown(pdf_bytes: bytes) -> str:
    """Runs PaddleOCR over every page and returns a page-tagged Markdown string."""
    engine = _get_ocr_engine()
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    try:
        markdown_parts: list[str] = []
        for page_index, page in enumerate(doc):
            page_number = page_index + 1
            image = _render_page_to_image(page)
            result = engine.ocr(_pil_to_ndarray(image), cls=True)
            lines = _extract_lines(result)
            logger.info(f"OCR page {page_number}: {len(lines)} lines recognized")
            markdown_parts.append(f"## Page {page_number}\n\n" + "\n".join(lines))
        return "\n\n".join(markdown_parts)
    finally:
        doc.close()


def _pil_to_ndarray(image: Image.Image):
    return np.array(image.convert("RGB"))


def _extract_lines(ocr_result) -> list[str]:
    lines: list[str] = []
    if not ocr_result:
        return lines
    for page_result in ocr_result:
        if not page_result:
            continue
        for line in page_result:
            # PaddleOCR line shape: [box, (text, confidence)]
            text = line[1][0]
            lines.append(text)
    return lines
