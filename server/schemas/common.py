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
