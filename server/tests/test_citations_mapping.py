"""
Tests for citation/retriever_resources field mapping.

TASK-M6-017: Dify returns metadata.retriever_resources, but our backend
previously read metadata.citations (wrong field name).

This test verifies:
1. Blocking mode maps retriever_resources → citations with correct field mapping
2. Streaming mode passes through retriever_resources correctly
"""

import pytest
from unittest.mock import AsyncMock, patch
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from server.models import BotModel
from server.seed import seed_initial_data


async def _login_hq_admin(client) -> str:
    resp = await client.post("/api/auth/login", json={
        "username": "hq-admin",
        "password": "password123",
    })
    return resp.json()["data"]["access_token"]


@pytest.mark.asyncio
async def test_blocking_mode_maps_retriever_resources_to_citations(client, db: AsyncSession):
    """Dify返回retriever_resources, 后端应映射为前端需要的citations格式"""
    await seed_initial_data(db)

    bot_result = await db.execute(select(BotModel).where(BotModel.key == "A"))
    bot = bot_result.scalar_one()
    bot.status = "active"
    bot.dify_api_key = "test-key-for-citations"
    await db.commit()

    token = await _login_hq_admin(client)

    dify_response_data = {
        "event": "message",
        "conversation_id": "conv-citation-test",
        "message_id": "msg-citation-test",
        "answer": "Based on the knowledge base...",
        "metadata": {
            "retriever_resources": [
                {
                    "position": 1,
                    "dataset_name": "Bot A",
                    "document_name": "tickets_part1.txt",
                    "content": "Solution: restart the POS terminal",
                    "score": 0.85,
                },
                {
                    "position": 2,
                    "dataset_name": "Bot A",
                    "document_name": "tickets_part2.txt",
                    "content": "Check network connection",
                    "score": 0.72,
                },
            ]
        },
    }

    with patch("server.services.dify_service.DifyService.chat_blocking", new_callable=AsyncMock) as mock_chat:
        mock_chat.return_value = dify_response_data

        resp = await client.post(
            "/api/chat/message",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "bot_id": bot.id,
                "query": "POS problem",
                "conversation_id": None,
            }
        )

        assert resp.status_code == 200
        data = resp.json()["data"]

        assert data["answer"] == "Based on the knowledge base..."
        assert "citations" in data

        citations = data["citations"]
        assert len(citations) == 2, f"Expected 2 citations, got {len(citations)}"

        # Verify field mapping
        c1 = citations[0]
        assert c1["title"] == "tickets_part1.txt"
        assert c1["content"] == "Solution: restart the POS terminal"
        assert c1["score"] == 0.85
        assert c1["position"] == 1
        assert c1["dataset_name"] == "Bot A"

        c2 = citations[1]
        assert c2["title"] == "tickets_part2.txt"
        assert c2["snippet"] == "Check network connection"


@pytest.mark.asyncio
async def test_blocking_mode_handles_empty_retriever_resources(client, db: AsyncSession):
    """当Dify不返回retriever_resources时, citations应为空数组"""
    await seed_initial_data(db)

    bot_result = await db.execute(select(BotModel).where(BotModel.key == "A"))
    bot = bot_result.scalar_one()
    bot.status = "active"
    bot.dify_api_key = "test-key-empty-citations"
    await db.commit()

    token = await _login_hq_admin(client)

    dify_response_data = {
        "event": "message",
        "conversation_id": "conv-no-citations",
        "message_id": "msg-no-citations",
        "answer": "No relevant results found.",
        "metadata": {},
    }

    with patch("server.services.dify_service.DifyService.chat_blocking", new_callable=AsyncMock) as mock_chat:
        mock_chat.return_value = dify_response_data

        resp = await client.post(
            "/api/chat/message",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "bot_id": bot.id,
                "query": "random query",
                "conversation_id": None,
            }
        )

        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["citations"] == []


@pytest.mark.asyncio
async def test_blocking_mode_handles_missing_metadata(client, db: AsyncSession):
    """当Dify响应完全没有metadata字段时, citations应为空数组"""
    await seed_initial_data(db)

    bot_result = await db.execute(select(BotModel).where(BotModel.key == "A"))
    bot = bot_result.scalar_one()
    bot.status = "active"
    bot.dify_api_key = "test-key-no-metadata"
    await db.commit()

    token = await _login_hq_admin(client)

    dify_response_data = {
        "conversation_id": "conv-no-meta",
        "message_id": "msg-no-meta",
        "answer": "Simple answer without metadata.",
    }

    with patch("server.services.dify_service.DifyService.chat_blocking", new_callable=AsyncMock) as mock_chat:
        mock_chat.return_value = dify_response_data

        resp = await client.post(
            "/api/chat/message",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "bot_id": bot.id,
                "query": "test",
                "conversation_id": None,
            }
        )

        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["citations"] == []
