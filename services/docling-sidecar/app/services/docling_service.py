"""Docling-based PDF structural parsing.

Converts a PDF (or, for scanned documents, an OCR-derived Markdown string)
into the structured shape the TypeScript backend expects: pages, each with
section-tagged text blocks, plus headings/tables/lists/markdown at the
document level. Page numbers and section hierarchy are preserved throughout
since they're later used for citation generation and obligation extraction.
"""

import tempfile
from pathlib import Path
from typing import Optional

from docling.document_converter import DocumentConverter
from docling_core.types.doc import DocItemLabel

from app.models.schemas import DocumentMetadata, Heading, ListData, Page, ParseResponse, Section, TableData
from app.utils.logging_config import logger

_converter: Optional[DocumentConverter] = None


def _get_converter() -> DocumentConverter:
    global _converter
    if _converter is None:
        _converter = DocumentConverter()
    return _converter


def _heading_level(item) -> int:
    return getattr(item, "level", 1) or 1


def _item_page_no(item) -> Optional[int]:
    prov = getattr(item, "prov", None)
    if prov:
        return prov[0].page_no
    return None


def _extract_table(item, doc) -> TableData:
    page_number = _item_page_no(item)
    caption = None
    try:
        caption = item.caption_text(doc) or None
    except Exception:
        pass

    rows: list[list[str]] = []
    try:
        dataframe = item.export_to_dataframe(doc)
        rows = [list(map(str, row)) for row in dataframe.values.tolist()]
        if not dataframe.columns.empty:
            rows.insert(0, [str(c) for c in dataframe.columns.tolist()])
    except Exception as exc:
        logger.warning(f"Failed to export table on page {page_number}: {exc}")

    return TableData(page_number=page_number, caption=caption, rows=rows)


def _parse_with_docling(source, ocr_used: bool) -> ParseResponse:
    converter = _get_converter()
    result = converter.convert(source)
    doc = result.document

    headings: list[Heading] = []
    tables: list[TableData] = []
    lists: list[ListData] = []
    pages_by_number: dict[int, list[Section]] = {}
    current_section_path: list[str] = []
    title: Optional[str] = None

    for item, _level in doc.iterate_items():
        label = getattr(item, "label", None)
        page_number = _item_page_no(item)

        if label == DocItemLabel.TITLE:
            text = getattr(item, "text", "") or ""
            if title is None:
                title = text
            headings.append(Heading(level=0, text=text, page_number=page_number))
            continue

        if label == DocItemLabel.SECTION_HEADER:
            text = getattr(item, "text", "") or ""
            level = _heading_level(item)
            headings.append(Heading(level=level, text=text, page_number=page_number))
            current_section_path = current_section_path[: level - 1] + [text]
            continue

        if label == DocItemLabel.TABLE:
            tables.append(_extract_table(item, doc))
            continue

        if label == DocItemLabel.LIST_ITEM:
            text = getattr(item, "text", "") or ""
            if lists and lists[-1].page_number == page_number:
                lists[-1].items.append(text)
            else:
                lists.append(ListData(page_number=page_number, items=[text], ordered=False))
            continue

        text = getattr(item, "text", None)
        if not text:
            continue

        if page_number is not None:
            section_path = " > ".join(current_section_path) if current_section_path else "Untitled"
            pages_by_number.setdefault(page_number, []).append(
                Section(section_path=section_path, text=text, page_number=page_number)
            )

    pages = [
        Page(page_number=page_number, sections=sections)
        for page_number, sections in sorted(pages_by_number.items())
    ]

    full_text = "\n\n".join(section.text for page in pages for section in page.sections)
    try:
        markdown = doc.export_to_markdown()
    except Exception as exc:
        logger.warning(f"Failed to export markdown: {exc}")
        markdown = full_text

    return ParseResponse(
        metadata=DocumentMetadata(title=title, page_count=len(pages), ocr_used=ocr_used),
        pages=pages,
        headings=headings,
        tables=tables,
        lists=lists,
        full_text=full_text,
        markdown=markdown,
        ocr_used=ocr_used,
    )


def parse_pdf_bytes(pdf_bytes: bytes) -> ParseResponse:
    """Parses a native (text-based) PDF directly."""
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=True) as tmp:
        tmp.write(pdf_bytes)
        tmp.flush()
        return _parse_with_docling(Path(tmp.name), ocr_used=False)


def parse_ocr_markdown(markdown_text: str) -> ParseResponse:
    """Parses OCR-derived Markdown text through Docling for structure extraction."""
    with tempfile.NamedTemporaryFile(suffix=".md", delete=True, mode="w", encoding="utf-8") as tmp:
        tmp.write(markdown_text)
        tmp.flush()
        return _parse_with_docling(Path(tmp.name), ocr_used=True)
