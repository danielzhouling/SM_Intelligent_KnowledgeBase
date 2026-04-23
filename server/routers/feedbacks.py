from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from server.auth.dependencies import get_current_user, require_permissions
from server.database import get_db
from server.models import BotModel, FeedbackModel, UserModel
from server.schemas.common import SuccessResponse
from server.schemas.feedback import FeedbackExportRequest, FeedbackReview, FeedbackSubmit

router = APIRouter(prefix="/api/feedbacks", tags=["feedbacks"])


@router.post("")
async def submit_feedback(
    body: FeedbackSubmit,
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """用户提交反馈"""
    new_feedback = FeedbackModel(
        user_id=current_user.id,
        bot_id=body.bot_id,
        conversation_id=body.conversation_id,
        message_id=body.message_id,
        query=body.query,
        answer=body.answer,
        rating=body.rating,
        reason=body.reason,
        comment=body.comment,
        status="pending",
    )
    db.add(new_feedback)
    await db.commit()
    await db.refresh(new_feedback)

    return SuccessResponse(data={
        "id": new_feedback.id,
        "status": new_feedback.status,
        "created_at": new_feedback.created_at.isoformat() if new_feedback.created_at else "",
    })


@router.get("")
async def list_feedbacks(
    bot_id: str | None = None,
    rating: str | None = None,
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
    _user: UserModel = Depends(require_permissions("feedback.view")),
):
    """反馈列表（管理后台，支持筛选）"""
    query = select(FeedbackModel).options(selectinload(FeedbackModel.bot))
    filters = []

    if bot_id:
        filters.append(FeedbackModel.bot_id == bot_id)
    if rating:
        filters.append(FeedbackModel.rating == rating)
    if status:
        filters.append(FeedbackModel.status == status)

    if filters:
        query = query.where(and_(*filters))

    query = query.order_by(FeedbackModel.created_at.desc())
    result = await db.execute(query)
    feedbacks = result.scalars().all()

    return SuccessResponse(data=[
        {
            "id": f.id,
            "bot_id": f.bot_id,
            "bot_name": f.bot.name if f.bot else None,
            "conversation_id": f.conversation_id,
            "message_id": f.message_id,
            "query": f.query,
            "answer": f.answer,
            "rating": f.rating,
            "reason": f.reason,
            "comment": f.comment,
            "status": f.status,
            "review_result": f.review_result,
            "review_comment": f.review_comment,
            "reviewer": f.reviewed_by,
            "reviewed_at": f.reviewed_at.isoformat() if f.reviewed_at else None,
            "created_at": f.created_at.isoformat() if f.created_at else "",
        }
        for f in feedbacks
    ])


@router.post("/{feedback_id}/review")
async def review_feedback(
    feedback_id: str,
    body: FeedbackReview,
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(require_permissions("feedback.review")),
):
    """审核反馈"""
    result = await db.execute(select(FeedbackModel).where(FeedbackModel.id == feedback_id))
    f = result.scalar_one_or_none()
    if not f:
        raise HTTPException(status_code=404, detail="Feedback not found")

    f.status = body.result
    f.review_result = body.result
    f.review_comment = body.review_comment
    f.reviewed_by = current_user.id
    f.reviewed_at = datetime.utcnow()

    await db.commit()

    return SuccessResponse(data={
        "id": f.id,
        "status": f.status,
        "review_result": f.review_result,
        "reviewed_at": f.reviewed_at.isoformat() if f.reviewed_at else None,
    })


@router.post("/export")
async def export_feedbacks(
    body: FeedbackExportRequest,
    db: AsyncSession = Depends(get_db),
    _user: UserModel = Depends(require_permissions("feedback.review")),
):
    """导出微调数据集"""
    query = select(FeedbackModel)
    filters = []

    if body.status:
        filters.append(FeedbackModel.status == body.status)
    if body.rating:
        filters.append(FeedbackModel.rating == body.rating)

    if filters:
        query = query.where(and_(*filters))

    result = await db.execute(query)
    feedbacks = result.scalars().all()

    records = []
    for f in feedbacks:
        records.append({
            "query": f.query,
            "original_answer": f.answer,
            "feedback_reason": f.reason or "",
            "correct_answer": f.review_comment or "",
            "bot_id": f.bot_id,
        })

    return SuccessResponse(data={
        "export_count": len(records),
        "records": records,
    })
