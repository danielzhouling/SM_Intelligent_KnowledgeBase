import uuid
from datetime import datetime

from sqlalchemy import Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from server.database import Base


class SyncStatusModel(Base):
    __tablename__ = "sync_status"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    collection: Mapped[str] = mapped_column(String(50), nullable=False)
    records_synced: Mapped[int] = mapped_column(Integer, default=0)
    synced_at: Mapped[datetime | None] = mapped_column(nullable=True)
    status: Mapped[str | None] = mapped_column(String(20), nullable=True)  # success / failed
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
