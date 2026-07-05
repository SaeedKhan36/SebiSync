"""Pydantic request/response models for the Docling sidecar service."""

from typing import Literal, Optional

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"


class TableData(BaseModel):
    page_number: Optional[int] = None
    caption: Optional[str] = None
    rows: list[list[str]] = Field(default_factory=list)


class ListData(BaseModel):
    page_number: Optional[int] = None
    items: list[str] = Field(default_factory=list)
    ordered: bool = False


class Heading(BaseModel):
    level: int
    text: str
    page_number: Optional[int] = None


class Section(BaseModel):
    section_path: str
    text: str
    page_number: Optional[int] = None


class Page(BaseModel):
    page_number: int
    sections: list[Section] = Field(default_factory=list)


class DocumentMetadata(BaseModel):
    title: Optional[str] = None
    page_count: int = 0
    ocr_used: bool = False


class ParseResponse(BaseModel):
    """
    Structured parse output. `pages` mirrors the shape the TypeScript
    backend's DoclingParseResult expects (pageNumber + sections with
    sectionPath/text), so citation generation there can preserve page and
    section provenance.
    """

    metadata: DocumentMetadata
    pages: list[Page] = Field(default_factory=list)
    headings: list[Heading] = Field(default_factory=list)
    tables: list[TableData] = Field(default_factory=list)
    lists: list[ListData] = Field(default_factory=list)
    full_text: str = ""
    markdown: str = ""
    ocr_used: bool = False


class ErrorResponse(BaseModel):
    detail: str
