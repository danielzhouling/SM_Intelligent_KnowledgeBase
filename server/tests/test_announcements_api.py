import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from server.models import AnnouncementModel


async def _login(client: AsyncClient, username: str = "admin", password: str = "admin123") -> str:
    resp = await client.post("/api/auth/login", json={"username": username, "password": password})
    assert resp.status_code == 200
    return resp.json()["data"]["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


class TestCreateAnnouncement:
    @pytest.mark.asyncio
    async def test_create_info(self, client: AsyncClient):
        token = await _login(client)
        resp = await client.post("/api/announcements", headers=_auth(token), json={
            "title": "系统升级通知",
            "content": "系统将于周六凌晨维护",
            "type": "info",
        })
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["title"] == "系统升级通知"
        assert data["type"] == "info"
        assert data["status"] == "published"
        assert "id" in data

    @pytest.mark.asyncio
    async def test_create_warning(self, client: AsyncClient):
        token = await _login(client)
        resp = await client.post("/api/announcements", headers=_auth(token), json={
            "title": "紧急通知",
            "content": "请尽快更新密码",
            "type": "warning",
        })
        assert resp.status_code == 200
        assert resp.json()["data"]["type"] == "warning"

    @pytest.mark.asyncio
    async def test_create_urgent(self, client: AsyncClient):
        token = await _login(client)
        resp = await client.post("/api/announcements", headers=_auth(token), json={
            "title": "安全告警",
            "content": "发现异常登录",
            "type": "urgent",
        })
        assert resp.status_code == 200
        assert resp.json()["data"]["type"] == "urgent"

    @pytest.mark.asyncio
    async def test_create_requires_auth(self, client: AsyncClient):
        resp = await client.post("/api/announcements", json={
            "title": "test", "content": "test", "type": "info",
        })
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_create_default_type_is_info(self, client: AsyncClient):
        token = await _login(client)
        resp = await client.post("/api/announcements", headers=_auth(token), json={
            "title": "通知",
            "content": "内容",
        })
        assert resp.status_code == 200
        assert resp.json()["data"]["type"] == "info"


class TestListAnnouncements:
    @pytest.mark.asyncio
    async def test_list_admin(self, client: AsyncClient):
        token = await _login(client)
        await client.post("/api/announcements", headers=_auth(token), json={
            "title": "A1", "content": "C1", "type": "info",
        })
        await client.post("/api/announcements", headers=_auth(token), json={
            "title": "A2", "content": "C2", "type": "warning",
        })
        resp = await client.get("/api/announcements", headers=_auth(token))
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["total"] >= 2

    @pytest.mark.asyncio
    async def test_list_requires_auth(self, client: AsyncClient):
        resp = await client.get("/api/announcements")
        assert resp.status_code == 401


class TestUpdateAnnouncement:
    @pytest.mark.asyncio
    async def test_update_title_and_content(self, client: AsyncClient):
        token = await _login(client)
        create_resp = await client.post("/api/announcements", headers=_auth(token), json={
            "title": "Old Title", "content": "Old Content", "type": "info",
        })
        ann_id = create_resp.json()["data"]["id"]

        resp = await client.put(f"/api/announcements/{ann_id}", headers=_auth(token), json={
            "title": "New Title", "content": "New Content",
        })
        assert resp.status_code == 200
        assert resp.json()["data"]["title"] == "New Title"

    @pytest.mark.asyncio
    async def test_update_nonexistent(self, client: AsyncClient):
        token = await _login(client)
        resp = await client.put("/api/announcements/nonexistent", headers=_auth(token), json={
            "title": "X",
        })
        assert resp.status_code == 404


class TestToggleAnnouncementStatus:
    @pytest.mark.asyncio
    async def test_offline_published(self, client: AsyncClient):
        token = await _login(client)
        create_resp = await client.post("/api/announcements", headers=_auth(token), json={
            "title": "Test", "content": "Test", "type": "info",
        })
        ann_id = create_resp.json()["data"]["id"]
        assert create_resp.json()["data"]["status"] == "published"

        resp = await client.patch(f"/api/announcements/{ann_id}/status", headers=_auth(token), json={
            "status": "offline",
        })
        assert resp.status_code == 200
        assert resp.json()["data"]["status"] == "offline"

    @pytest.mark.asyncio
    async def test_republish_offline(self, client: AsyncClient):
        token = await _login(client)
        create_resp = await client.post("/api/announcements", headers=_auth(token), json={
            "title": "Test", "content": "Test", "type": "info",
        })
        ann_id = create_resp.json()["data"]["id"]

        await client.patch(f"/api/announcements/{ann_id}/status", headers=_auth(token), json={"status": "offline"})
        resp = await client.patch(f"/api/announcements/{ann_id}/status", headers=_auth(token), json={"status": "published"})
        assert resp.status_code == 200
        assert resp.json()["data"]["status"] == "published"

    @pytest.mark.asyncio
    async def test_invalid_status(self, client: AsyncClient):
        token = await _login(client)
        create_resp = await client.post("/api/announcements", headers=_auth(token), json={
            "title": "Test", "content": "Test", "type": "info",
        })
        ann_id = create_resp.json()["data"]["id"]

        resp = await client.patch(f"/api/announcements/{ann_id}/status", headers=_auth(token), json={
            "status": "draft",
        })
        assert resp.status_code == 400


class TestGetActiveAnnouncement:
    @pytest.mark.asyncio
    async def test_no_active_returns_null(self, client: AsyncClient):
        token = await _login(client)
        resp = await client.get("/api/announcements/active", headers=_auth(token))
        assert resp.status_code == 200
        assert resp.json()["data"] is None

    @pytest.mark.asyncio
    async def test_returns_latest_published(self, client: AsyncClient):
        token = await _login(client)
        await client.post("/api/announcements", headers=_auth(token), json={
            "title": "First", "content": "First", "type": "info",
        })
        await client.post("/api/announcements", headers=_auth(token), json={
            "title": "Second", "content": "Second", "type": "warning",
        })

        resp = await client.get("/api/announcements/active", headers=_auth(token))
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["title"] in ("First", "Second")
        assert data["type"] in ("info", "warning")

    @pytest.mark.asyncio
    async def test_offline_not_returned(self, client: AsyncClient):
        token = await _login(client)
        create_resp = await client.post("/api/announcements", headers=_auth(token), json={
            "title": "Offline", "content": "Offline", "type": "info",
        })
        ann_id = create_resp.json()["data"]["id"]
        await client.patch(f"/api/announcements/{ann_id}/status", headers=_auth(token), json={"status": "offline"})

        resp = await client.get("/api/announcements/active", headers=_auth(token))
        assert resp.status_code == 200
        assert resp.json()["data"] is None

    @pytest.mark.asyncio
    async def test_active_requires_auth(self, client: AsyncClient):
        resp = await client.get("/api/announcements/active")
        assert resp.status_code == 401
