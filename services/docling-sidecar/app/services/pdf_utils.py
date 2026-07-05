"""Lightweight helpers for detecting whether a PDF is text-based or scanned."""

import fitz  # PyMuPDF

MIN_CHARS_PER_PAGE = 20


def is_scanned_pdf(pdf_bytes: bytes) -> bool:
    """
    Heuristic: open the PDF and check how much selectable text each page
    yields. If the overwhelming majority of pages have near-zero extractable
    text, treat the document as scanned/image-based and route it through OCR
    before Docling.
    """
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    try:
        if doc.page_count == 0:
            return False

        pages_with_little_text = 0
        for page in doc:
            text = page.get_text("text")
            if len(text.strip()) < MIN_CHARS_PER_PAGE:
                pages_with_little_text += 1

        return pages_with_little_text / doc.page_count > 0.5
    finally:
        doc.close()


def get_page_count(pdf_bytes: bytes) -> int:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    try:
        return doc.page_count
    finally:
        doc.close()
