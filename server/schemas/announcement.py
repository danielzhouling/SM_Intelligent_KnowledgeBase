from datetime import datetime

from pydantic import BaseModel


class AnnouncementCreate(BaseModel):
    title: str
    content: str
    type: str = "info"


class AnnouncementUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    type: str | None = None


class AnnouncementStatusUpdate(BaseModel):
    status: str


class AnnouncementResponse(BaseModel):
    id: str
    title: str
    content: str
    type: str
    status: str
    published_at: datetime | None = None
    created_by: str | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class ActiveAnnouncementResponse(BaseModel):
    id: str
    title: str
    content: str
    type: str

    model_config = {"from_attributes": True}
