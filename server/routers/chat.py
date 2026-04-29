import json
from typing import AsyncGenerator

import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from server.auth.dependencies import get_current_user
from server.config import settings
from server.database import get_db
from server.models import BotModel, ConversationModel, UserModel
from server.schemas.chat import ChatMessageRequest
from server.schemas.common import SuccessResponse
from server.services.dify_service import DifyServiceError, dify_service

router = APIRouter(prefix="/api/chat", tags=["chat"])


def _check_bot_permission(user: UserModel, bot: BotModel) -> None:
    """Check if user has permission to access this bot."""
    user_perms = set()
    for role in user.roles:
        for perm in role.permissions:
            user_perms.add(perm.key)

    if "bot.*" not in user_perms and f"bot.{bot.key}" not in user_perms:
        raise HTTPException(status_code=403, detail="无权访问该Bot")


def _check_bot_active(bot: BotModel) -> None:
    """Check if bot is active."""
    if bot.status != "active":
        raise HTTPException(status_code=403, detail="该Bot已下线")
    if not bot.dify_api_key:
        raise HTTPException(status_code=403, detail="该Bot未配置API Key")


@router.get("/conversations")
async def list_conversations(
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """获取当前用户的会话列表（支持分页）"""
    from server.schemas.common import PaginationParams, PaginatedData

    p = PaginationParams(page=page, page_size=page_size)

    # Get total count
    count_result = await db.execute(
        select(ConversationModel).where(ConversationModel.user_id == current_user.id)
    )
    total = len(count_result.scalars().all())

    # Get paginated conversations
    result = await db.execute(
        select(ConversationModel)
        .where(ConversationModel.user_id == current_user.id)
        .order_by(ConversationModel.updated_at.desc())
        .offset(p.offset)
        .limit(p.page_size)
    )
    convs = result.scalars().all()

    return SuccessResponse(data=PaginatedData(
        items=[
            {
                "id": c.id,
                "bot_id": c.bot_id,
                "title": c.title,
                "created_at": c.created_at.isoformat() if c.created_at else "",
                "updated_at": c.updated_at.isoformat() if c.updated_at else "",
            }
            for c in convs
        ],
        total=total,
        page=p.page,
        page_size=p.page_size,
    ).model_dump())


@router.get("/conversations/{conversation_id}/messages")
async def get_messages(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """获取会话历史消息（从Dify API获取）"""
    # Verify conversation belongs to user
    result = await db.execute(
        select(ConversationModel).where(
            ConversationModel.id == conversation_id,
            ConversationModel.user_id == current_user.id,
        )
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="会话不存在")

    # Get bot info
    bot_result = await db.execute(select(BotModel).where(BotModel.id == conv.bot_id))
    bot = bot_result.scalar_one_or_none()

    if not bot or not bot.dify_api_key:
        raise HTTPException(status_code=400, detail="Bot配置异常")

    # Fetch messages from Dify
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(
                f"{settings.DIFY_API_BASE_URL}/messages?conversation_id={conv.dify_conversation_id}&user={current_user.id}",
                headers={"Authorization": f"Bearer {bot.dify_api_key}"},
            )
            if resp.status_code == 200:
                data = resp.json()
                messages = data.get("data", [])
                return SuccessResponse(data=[
                    {
                        "id": m.get("id", ""),
                        "role": m.get("role", ""),
                        "content": m.get("answer", m.get("query", "")),
                        "created_at": m.get("created_at", ""),
                    }
                    for m in messages
                ])
            else:
                return SuccessResponse(data=[])
    except Exception:
        return SuccessResponse(data=[])


@router.post("/message")
async def send_message(
    body: ChatMessageRequest,
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """发送消息（阻塞模式）"""
    # Get bot
    bot_result = await db.execute(select(BotModel).where(BotModel.id == body.bot_id))
    bot = bot_result.scalar_one_or_none()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot不存在")

    _check_bot_permission(current_user, bot)
    _check_bot_active(bot)

    # Resolve dify_conversation_id: 已有会话时, 用我们的 UUID 查表获取 Dify ID
    dify_conv_id = ""
    if body.conversation_id:
        conv_result = await db.execute(
            select(ConversationModel).where(ConversationModel.id == body.conversation_id)
        )
        conv = conv_result.scalar_one_or_none()
        if conv:
            dify_conv_id = conv.dify_conversation_id

    try:
        dify_resp = await dify_service.chat_blocking(
            db=db,
            bot_key=bot.key,
            query=body.query,
            user_id=current_user.id,
            conversation_id=dify_conv_id,
        )

        conversation_id = dify_resp.get("conversation_id", "")
        message_id = dify_resp.get("message_id", "")
        answer = dify_resp.get("answer", "")
        citations = dify_resp.get("metadata", {}).get("citations", [])

        # Create or get conversation mapping
        if body.conversation_id:
            # Existing conversation
            conv_result = await db.execute(
                select(ConversationModel).where(ConversationModel.id == body.conversation_id)
            )
            conv = conv_result.scalar_one_or_none()
            if conv:
                conv.updated_at = func.now()
        elif conversation_id:
            # New conversation
            title = body.query[:50] if len(body.query) <= 50 else body.query[:47] + "..."
            new_conv = ConversationModel(
                user_id=current_user.id,
                bot_id=bot.id,
                dify_conversation_id=conversation_id,
                title=title,
            )
            db.add(new_conv)
            await db.flush()
            conversation_id = new_conv.id
        else:
            conversation_id = ""

        await db.commit()

        return SuccessResponse(data={
            "answer": answer,
            "conversation_id": conversation_id,
            "message_id": message_id,
            "citations": citations,
        })

    except DifyServiceError as e:
        raise HTTPException(status_code=502, detail=str(e))


async def _stream_generator(
    bot_key: str,
    query: str,
    user_id: str,
    conversation_id: str,
    db: AsyncSession,
    current_user: UserModel,
    bot: BotModel,
    our_conversation_id: str = "",
) -> AsyncGenerator[str, None]:
    """Internal generator for SSE streaming.

    conversation_id: Dify conversation ID (已解析,空字符串表示新会话)
    our_conversation_id: 我们的内部 UUID (已有会话时传入,用于更新 existing conversation)
    """
    final_data = {}

    try:
        async for chunk in dify_service.chat_stream(
            db=db,
            bot_key=bot.key,
            query=query,
            user_id=user_id,
            conversation_id=conversation_id,
        ):
            # chunk is pure JSON from Dify
            if chunk.strip():
                yield f"data: {chunk}\n\n"

            # Try to parse conversation_id from message_end
            try:
                data_str = chunk.strip()
                if data_str.startswith("{"):
                    data = json.loads(data_str)
                    if data.get("event") == "message_end":
                        final_data = data
                        dify_returned_conv_id = data.get("conversation_id", "")
                        if dify_returned_conv_id:
                            title = query[:50]
                            if our_conversation_id:
                                # 已有会话: 更新 existing conversation
                                conv_result = await db.execute(
                                    select(ConversationModel).where(
                                        ConversationModel.id == our_conversation_id
                                    )
                                )
                                existing_conv = conv_result.scalar_one_or_none()
                                if existing_conv:
                                    existing_conv.dify_conversation_id = dify_returned_conv_id
                                    existing_conv.updated_at = func.now()
                                    await db.commit()
                                    final_data["our_conversation_id"] = our_conversation_id
                            else:
                                # 新会话: 创建 conversation mapping
                                new_conv = ConversationModel(
                                    user_id=current_user.id,
                                    bot_id=bot.id,
                                    dify_conversation_id=dify_returned_conv_id,
                                    title=title,
                                )
                                db.add(new_conv)
                                await db.commit()
                                final_data["our_conversation_id"] = new_conv.id
            except json.JSONDecodeError:
                pass

    except DifyServiceError as e:
        yield f'data: {{"event": "error", "message": "{str(e)}"}}\n\n'
    except Exception as e:
        yield f'data: {{"event": "error", "message": "网络连接中断，请重试"}}\n\n'


@router.post("/message/stream")
async def send_message_stream(
    body: ChatMessageRequest,
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """发送消息（流式模式，SSE）"""
    # Get bot
    bot_result = await db.execute(select(BotModel).where(BotModel.id == body.bot_id))
    bot = bot_result.scalar_one_or_none()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot不存在")

    _check_bot_permission(current_user, bot)
    _check_bot_active(bot)

    # Resolve dify_conversation_id: 已有会话时, 用我们的 UUID 查表获取 Dify ID
    dify_conv_id = ""
    if body.conversation_id:
        conv_result = await db.execute(
            select(ConversationModel).where(ConversationModel.id == body.conversation_id)
        )
        conv = conv_result.scalar_one_or_none()
        if conv:
            dify_conv_id = conv.dify_conversation_id

    generator = _stream_generator(
        bot_key=bot.key,
        query=body.query,
        user_id=current_user.id,
        conversation_id=dify_conv_id,
        db=db,
        current_user=current_user,
        bot=bot,
        our_conversation_id=body.conversation_id or "",
    )

    return StreamingResponse(
        generator,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """删除会话"""
    # Verify conversation belongs to current user
    result = await db.execute(
        select(ConversationModel).where(
            ConversationModel.id == conversation_id,
            ConversationModel.user_id == current_user.id,
        )
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="会话不存在")

    await db.delete(conv)
    await db.commit()

    return SuccessResponse(data={"id": conversation_id, "deleted": True})
