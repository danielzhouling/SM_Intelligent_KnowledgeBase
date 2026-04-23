from typing import AsyncGenerator

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from server.config import settings
from server.models import BotModel


class DifyServiceError(Exception):
    pass


class DifyService:
    """Dify API client supporting blocking and streaming modes."""

    async def _get_api_key(self, db: AsyncSession, bot_key: str) -> str | None:
        result = await db.execute(select(BotModel).where(BotModel.key == bot_key))
        bot = result.scalar_one_or_none()
        return bot.dify_api_key if bot else None

    async def chat_blocking(
        self,
        db: AsyncSession,
        bot_key: str,
        query: str,
        user_id: str,
        conversation_id: str = "",
    ) -> dict:
        """Send a message and get blocking response."""
        api_key = await self._get_api_key(db, bot_key)
        if not api_key:
            raise DifyServiceError(f"Bot {bot_key} not configured")

        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"{settings.DIFY_API_BASE_URL}/chat-messages",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {api_key}",
                },
                json={
                    "inputs": {},
                    "query": query,
                    "response_mode": "blocking",
                    "conversation_id": conversation_id,
                    "user": user_id,
                },
            )
            if resp.status_code != 200:
                raise DifyServiceError(f"Dify API error: {resp.status_code} {resp.text}")
            return resp.json()

    async def chat_stream(
        self,
        db: AsyncSession,
        bot_key: str,
        query: str,
        user_id: str,
        conversation_id: str = "",
    ) -> AsyncGenerator[str, None]:
        """Send a message and yield SSE chunks."""
        api_key = await self._get_api_key(db, bot_key)
        if not api_key:
            raise DifyServiceError(f"Bot {bot_key} not configured")

        async with httpx.AsyncClient(timeout=60.0) as client:
            async with client.stream(
                "POST",
                f"{settings.DIFY_API_BASE_URL}/chat-messages",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {api_key}",
                },
                json={
                    "inputs": {},
                    "query": query,
                    "response_mode": "streaming",
                    "conversation_id": conversation_id,
                    "user": user_id,
                },
            ) as resp:
                if resp.status_code != 200:
                    text = await resp.aread()
                    raise DifyServiceError(f"Dify API error: {resp.status_code} {text.decode()}")

                async for line in resp.aiter_lines():
                    if line.startswith("data: "):
                        yield line[6:]


dify_service = DifyService()
