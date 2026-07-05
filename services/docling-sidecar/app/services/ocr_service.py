"""PaddleOCR fallback for scanned/image-based PDFs.

Renders each page to an image and runs PaddleOCR over it, then reassembles
the recognized text into a page-tagged Markdown document that Docling can
subsequently parse for structure (headings/sections), same as it would for
a native text PDF.

Uses PaddleOCR's `predict()` API (PaddleOCR >=3.x) — the older `ocr()`
method's constructor kwargs (`use_angle_cls`, `show_log`) and result shape
(list of [box, (text, score)] tuples) are from the 2.x line, which this
version does not use.
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
        _ocr_engine = PaddleOCR(
            lang="en",
            use_doc_orientation_classify=False,
            use_doc_unwarping=False,
            use_textline_orientation=False,
        )
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
            results = engine.predict(_pil_to_ndarray(image))
            lines = _extract_lines(results)
            logger.info(f"OCR page {page_number}: {len(lines)} lines recognized")
            markdown_parts.append(f"## Page {page_number}\n\n" + "\n".join(lines))
        return "\n\n".join(markdown_parts)
    finally:
        doc.close()


def _pil_to_ndarray(image: Image.Image):
    return np.array(image.convert("RGB"))


def _extract_lines(predict_results) -> list[str]:
    lines: list[str] = []
    for result in predict_results:
        rec_texts = result.json.get("res", {}).get("rec_texts", [])
        lines.extend(rec_texts)
    return lines
