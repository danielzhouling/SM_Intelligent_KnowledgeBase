from typing import Optional

import httpx

from server.config import settings


class FeishuClient:
    """Async client for Feishu (Lark) spreadsheet APIs."""

    def __init__(self):
        self.access_token: Optional[str] = None

    async def get_access_token(self) -> str:
        if self.access_token:
            return self.access_token

        url = "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal"
        payload = {"app_id": settings.FEISHU_APP_ID, "app_secret": settings.FEISHU_APP_SECRET}
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, json=payload, timeout=30)
            resp.raise_for_status()
            data = resp.json()
            if data.get("code") != 0:
                raise Exception(f"飞书认证失败: {data}")
            self.access_token = data["tenant_access_token"]
            return self.access_token

    async def get_sheet_data(self, sheet_id: str, range_str: str = "A1:Z100") -> list:
        token = await self.get_access_token()
        url = (
            f"https://open.feishu.cn/open-apis/sheets/v2/spreadsheets/{settings.FEISHU_APP_TOKEN}"
            f"/values/{sheet_id}!{range_str}"
        )
        headers = {"Authorization": f"Bearer {token}"}
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=headers, timeout=30)
            resp.raise_for_status()
            data = resp.json()
            if data.get("code") != 0:
                raise Exception(f"读取飞书表格失败: {data}")
            return data["data"]["valueRange"]["values"]

    async def get_sheet_list(self) -> list:
        token = await self.get_access_token()
        url = (
            f"https://open.feishu.cn/open-apis/sheets/v3/spreadsheets/{settings.FEISHU_APP_TOKEN}"
            f"/sheets/query"
        )
        headers = {"Authorization": f"Bearer {token}"}
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=headers, timeout=30)
            resp.raise_for_status()
            data = resp.json()
            if data.get("code") != 0:
                raise Exception(f"获取Sheet列表失败: {data}")
            return data["data"]["sheets"]


feishu_client = FeishuClient()
