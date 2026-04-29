from typing import Any

from pydantic import BaseModel


class SuccessResponse(BaseModel):
    success: bool = True
    data: Any


class ErrorDetail(BaseModel):
    code: str
    message: str


class ErrorResponse(BaseModel):
    success: bool = False
    error: ErrorDetail


class PaginatedData(BaseModel):
    items: list
    total: int
    page: int
    page_size: int


class PaginatedResponse(BaseModel):
    success: bool = True
    data: PaginatedData


class PaginationParams:
    """Common pagination parameters."""
    def __init__(self, page: int = 1, page_size: int = 20):
        if page < 1:
            page = 1
        if page_size < 1:
            page_size = 20
        if page_size > 100:
            page_size = 100
        self.page = page
        self.page_size = page_size
        self.offset = (page - 1) * page_size
