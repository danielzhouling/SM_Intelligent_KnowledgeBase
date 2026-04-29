"""
Tests for chat router - multi-session continuation.

TASK-M5-005: 多会话延续修复

Bug: 后端 chat.py 收到前端传来的 conversation_id (我们自己的 UUID) 后,
直接传给 Dify。Dify 不认识这个 UUID, 会创建新会话。

Fix: 后端需要先通过 body.conversation_id 查询 ConversationModel.dify_conversation_id,
将 Dify ID 传给 Dify。

Test cases:
1. 新会话 (conversation_id=null) -> 传给 Dify 空字符串
2. 已有会话 (conversation_id=our-uuid) -> 查询得到 dify_id, 传给 Dify
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from server.models import BotModel, ConversationModel, UserModel
from server.seed import seed_initial_data


async def _login_hq_admin(client) -> str:
    resp = await client.post("/api/auth/login", json={
        "username": "hq-admin",
        "password": "password123",
    })
    return resp.json()["data"]["access_token"]


@pytest.mark.asyncio
async def test_blocking_mode_passes_empty_string_for_new_session(client, db: AsyncSession):
    """新会话时 (无 conversation_id), 应传空字符串给 Dify"""
    await seed_initial_data(db)

    # Setup: make Bot A active
    bot_result = await db.execute(select(BotModel).where(BotModel.key == "A"))
    bot = bot_result.scalar_one()
    bot.status = "active"
    bot.dify_api_key = "test-key-for-blocking"
    await db.commit()

    token = await _login_hq_admin(client)

    # Mock Dify API response
    dify_response_data = {
        "event": "message_end",
        "conversation_id": "dify-new-conv-999",
        "message_id": "msg-123",
        "answer": "Test answer",
    }

    with patch("server.services.dify_service.DifyService.chat_blocking", new_callable=AsyncMock) as mock_chat:
        mock_chat.return_value = dify_response_data

        resp = await client.post(
            "/api/chat/message",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "bot_id": bot.id,
                "query": "Hello",
                "conversation_id": None,  # 新会话
            }
        )

        assert resp.status_code == 200

        # Verify Dify was called with empty conversation_id
        call_args = mock_chat.call_args
        assert call_args.kwargs["conversation_id"] == "", \
            f"新会话应传空字符串给 Dify, 实际: {call_args.kwargs['conversation_id']}"


@pytest.mark.asyncio
async def test_blocking_mode_resolves_dify_conversation_id_for_existing_session(client, db: AsyncSession):
    """已有会话时, 应查询 dify_conversation_id 并传给 Dify"""
    await seed_initial_data(db)

    # Setup: make Bot A active and create a conversation mapping
    bot_result = await db.execute(select(BotModel).where(BotModel.key == "A"))
    bot = bot_result.scalar_one()
    bot.status = "active"
    bot.dify_api_key = "test-key-for-existing"
    await db.commit()

    user_result = await db.execute(select(UserModel).where(UserModel.username == "hq-admin"))
    user = user_result.scalar_one()

    # 创建会话映射: our UUID <-> dify UUID
    our_conv_id = "our-internal-uuid-12345"
    dify_conv_id = "dify-real-conversation-id-abc"

    conv = ConversationModel(
        id=our_conv_id,
        user_id=user.id,
        bot_id=bot.id,
        dify_conversation_id=dify_conv_id,
        title="Existing session",
    )
    db.add(conv)
    await db.commit()

    token = await _login_hq_admin(client)

    # Mock Dify API
    dify_response_data = {
        "event": "message_end",
        "conversation_id": dify_conv_id,
        "message_id": "msg-456",
        "answer": "Continue conversation",
    }

    with patch("server.services.dify_service.DifyService.chat_blocking", new_callable=AsyncMock) as mock_chat:
        mock_chat.return_value = dify_response_data

        resp = await client.post(
            "/api/chat/message",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "bot_id": bot.id,
                "query": "Continue",
                "conversation_id": our_conv_id,  # 传我们的 UUID
            }
        )

        assert resp.status_code == 200

        # CRITICAL: 验证传给我们 Dify 的是 dify_conversation_id, 不是我们的 UUID
        call_args = mock_chat.call_args
        passed_conv_id = call_args.kwargs["conversation_id"]

        assert passed_conv_id == dify_conv_id, \
            f"已有会话应传 dify_conv_id={dify_conv_id} 给 Dify, 实际: {passed_conv_id}"
        assert passed_conv_id != our_conv_id, \
            "不应传我们的 UUID 给 Dify"


@pytest.mark.asyncio
async def test_streaming_mode_resolves_dify_conversation_id_for_existing_session(client, db: AsyncSession):
    """流式模式: 已有会话时, 应查询 dify_conversation_id 并传给 Dify"""
    await seed_initial_data(db)

    # Setup
    bot_result = await db.execute(select(BotModel).where(BotModel.key == "A"))
    bot = bot_result.scalar_one()
    bot.status = "active"
    bot.dify_api_key = "test-key-for-streaming"
    await db.commit()

    user_result = await db.execute(select(UserModel).where(UserModel.username == "hq-admin"))
    user = user_result.scalar_one()

    our_conv_id = "our-stream-uuid-999"
    dify_conv_id = "dify-stream-conv-xyz"

    conv = ConversationModel(
        id=our_conv_id,
        user_id=user.id,
        bot_id=bot.id,
        dify_conversation_id=dify_conv_id,
        title="Streaming session",
    )
    db.add(conv)
    await db.commit()

    token = await _login_hq_admin(client)

    # Mock streaming generator
    async def mock_stream(*args, **kwargs):
        yield '{"event": "message", "content": "Hel"}'
        yield '{"event": "message_end", "conversation_id": "dify-stream-conv-xyz", "message_id": "msg-789", "answer": "Hello!"}'

    with patch("server.services.dify_service.DifyService.chat_stream", new_callable=AsyncMock) as mock_chat:
        mock_chat.return_value = mock_stream(  # Return the generator directly
            bot_key=bot.key,
            query="Hi",
            user_id=user.id,
            conversation_id=dify_conv_id,  # This is what we expect to be passed
        )

        # Also patch at the router level
        with patch("server.routers.chat.dify_service.chat_stream", new_callable=AsyncMock) as mock_router_stream:
            mock_router_stream.return_value = mock_stream(
                bot_key=bot.key,
                query="Hi",
                user_id=user.id,
                conversation_id=dify_conv_id,
            )

            resp = await client.post(
                "/api/chat/message/stream",
                headers={"Authorization": f"Bearer {token}"},
                json={
                    "bot_id": bot.id,
                    "query": "Hi",
                    "conversation_id": our_conv_id,  # 传我们的 UUID
                }
            )

            assert resp.status_code == 200

            # 验证传给 Dify 的是 dify_conv_id
            call_args = mock_router_stream.call_args
            passed_conv_id = call_args.kwargs.get("conversation_id") or call_args[1].get("conversation_id")

            assert passed_conv_id == dify_conv_id, \
                f"流式模式应有会话传 dify_conv_id={dify_conv_id}, 实际: {passed_conv_id}"


@pytest.mark.asyncio
async def test_conversations_endpoint_returns_paginated_results(client):
    """验证: GET /api/chat/conversations 返回分页格式"""
    token = await _login_hq_admin(client)
    resp = await client.get(
        "/api/chat/conversations",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    # 分页格式
    assert "items" in data
    assert "total" in data
    assert "page" in data
    assert "page_size" in data
