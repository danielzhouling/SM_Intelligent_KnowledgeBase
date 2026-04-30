from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from server.auth.dependencies import get_current_user
from server.database import get_db
from server.models import AnnouncementModel, UserModel
from server.schemas.announcement import (
    ActiveAnnouncementResponse,
    AnnouncementCreate,
    AnnouncementResponse,
    AnnouncementStatusUpdate,
    AnnouncementUpdate,
)
from server.schemas.common import PaginatedData, PaginationParams, SuccessResponse

router = APIRouter(prefix="/api/announcements", tags=["announcements"])


@router.post("")
async def create_announcement(
    body: AnnouncementCreate,
    current_user: UserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ann = AnnouncementModel(
        title=body.title,
        content=body.content,
        type=body.type,
        created_by=current_user.id,
    )
    db.add(ann)
    await db.commit()
    await db.refresh(ann)
    return SuccessResponse(data=AnnouncementResponse.model_validate(ann).model_dump())


@router.get("")
async def list_announcements(
    current_user: UserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    page: int = 1,
    page_size: int = 20,
):
    pagination = PaginationParams(page=page, page_size=page_size)

    count_result = await db.execute(select(AnnouncementModel))
    total = len(count_result.scalars().all())

    result = await db.execute(
        select(AnnouncementModel)
        .order_by(AnnouncementModel.created_at.desc())
        .offset(pagination.offset)
        .limit(pagination.page_size)
    )
    items = [AnnouncementResponse.model_validate(a).model_dump() for a in result.scalars().all()]

    return SuccessResponse(data=PaginatedData(items=items, total=total, page=pagination.page, page_size=pagination.page_size).model_dump())


@router.put("/{ann_id}")
async def update_announcement(
    ann_id: str,
    body: AnnouncementUpdate,
    current_user: UserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(AnnouncementModel).where(AnnouncementModel.id == ann_id))
    ann = result.scalar_one_or_none()
    if ann is None:
        raise HTTPException(status_code=404, detail="Announcement not found")

    if body.title is not None:
        ann.title = body.title
    if body.content is not None:
        ann.content = body.content
    if body.type is not None:
        ann.type = body.type

    await db.commit()
    await db.refresh(ann)
    return SuccessResponse(data=AnnouncementResponse.model_validate(ann).model_dump())


@router.patch("/{ann_id}/status")
async def toggle_announcement_status(
    ann_id: str,
    body: AnnouncementStatusUpdate,
    current_user: UserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.status not in ("published", "offline"):
        raise HTTPException(status_code=400, detail="Status must be 'published' or 'offline'")

    result = await db.execute(select(AnnouncementModel).where(AnnouncementModel.id == ann_id))
    ann = result.scalar_one_or_none()
    if ann is None:
        raise HTTPException(status_code=404, detail="Announcement not found")

    ann.status = body.status
    await db.commit()
    await db.refresh(ann)
    return SuccessResponse(data=AnnouncementResponse.model_validate(ann).model_dump())


@router.get("/active")
async def get_active_announcement(
    current_user: UserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AnnouncementModel)
        .where(AnnouncementModel.status == "published")
        .order_by(AnnouncementModel.created_at.desc())
        .limit(1)
    )
    ann = result.scalar_one_or_none()
    if ann is None:
        return SuccessResponse(data=None)

    return SuccessResponse(data=ActiveAnnouncementResponse.model_validate(ann).model_dump())
