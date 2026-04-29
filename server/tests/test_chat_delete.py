"""
Tests for conversation deletion.

TASK-M5-006 审计修复:
deleteConversation(app.js) 在真实模式下不调用后端 API,
仅清 localStorage 和重渲染 UI，刷新后会话重现。

需要:
1. 后端: DELETE /api/chat/conversations/{conversation_id}
2. 前端: ApiService.deleteConversation()
3. 前端: app.js 调用 ApiService.deleteConversation()
"""

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from server.models import ConversationModel, UserModel, BotModel
from server.seed import seed_initial_data


async def _login_hq_admin(client) -> str:
    resp = await client.post("/api/auth/login", json={
        "username": "hq-admin",
        "password": "password123",
    })
    return resp.json()["data"]["access_token"]


@pytest.mark.asyncio
async def test_delete_conversation_removes_from_database(client, db: AsyncSession):
    """删除会话应该从数据库中移除"""
    await seed_initial_data(db)

    # Setup: create a conversation
    user_result = await db.execute(select(UserModel).where(UserModel.username == "hq-admin"))
    user = user_result.scalar_one()

    bot_result = await db.execute(select(BotModel).where(BotModel.key == "A"))
    bot = bot_result.scalar_one()
    bot.status = "active"
    bot.dify_api_key = "test-key"
    await db.commit()

    conv = ConversationModel(
        id="test-conv-to-delete",
        user_id=user.id,
        bot_id=bot.id,
        dify_conversation_id="dify-conv-123",
        title="Test conversation",
    )
    db.add(conv)
    await db.commit()

    token = await _login_hq_admin(client)

    # Delete the conversation
    resp = await client.delete(
        f"/api/chat/conversations/test-conv-to-delete",
        headers={"Authorization": f"Bearer {token}"}
    )

    assert resp.status_code == 200

    # Verify it's gone from database
    result = await db.execute(
        select(ConversationModel).where(ConversationModel.id == "test-conv-to-delete")
    )
    assert result.scalar_one_or_none() is None, "Conversation should be deleted"


@pytest.mark.asyncio
async def test_delete_conversation_requires_auth(client):
    """删除会话需要认证"""
    resp = await client.delete("/api/chat/conversations/some-id")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_delete_nonexistent_conversation_returns_404(client):
    """删除不存在的会话返回 404"""
    token = await _login_hq_admin(client)
    resp = await client.delete(
        "/api/chat/conversations/nonexistent-id",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 404
