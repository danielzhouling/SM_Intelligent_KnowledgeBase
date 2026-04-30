import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from server.auth.jwt import get_password_hash, verify_password
from server.models import PasswordHistoryModel, UserModel


async def _login(client: AsyncClient, username: str = "admin", password: str = "admin123") -> str:
    resp = await client.post("/api/auth/login", json={"username": username, "password": password})
    assert resp.status_code == 200
    return resp.json()["data"]["access_token"]


def _auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


class TestGetProfile:
    @pytest.mark.asyncio
    async def test_get_profile(self, client: AsyncClient):
        token = await _login(client)
        resp = await client.get("/api/auth/profile", headers=_auth_headers(token))
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["username"] == "admin"
        assert data["display_name"] == "系统管理员"
        assert data["email"] == ""
        assert data["phone"] == ""
        assert "roles" in data
        assert isinstance(data["password_age_days"], int)

    @pytest.mark.asyncio
    async def test_get_profile_requires_auth(self, client: AsyncClient):
        resp = await client.get("/api/auth/profile")
        assert resp.status_code == 401


class TestUpdateProfile:
    @pytest.mark.asyncio
    async def test_update_display_name(self, client: AsyncClient):
        token = await _login(client)
        resp = await client.put("/api/auth/profile", headers=_auth_headers(token), json={
            "display_name": "新名称",
            "email": "admin@example.com",
            "phone": "1234567890",
        })
        assert resp.status_code == 200

        # Verify changes persisted
        resp2 = await client.get("/api/auth/profile", headers=_auth_headers(token))
        data = resp2.json()["data"]
        assert data["display_name"] == "新名称"
        assert data["email"] == "admin@example.com"
        assert data["phone"] == "1234567890"

    @pytest.mark.asyncio
    async def test_update_profile_requires_auth(self, client: AsyncClient):
        resp = await client.put("/api/auth/profile", json={"display_name": "x"})
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_update_profile_empty_strings(self, client: AsyncClient):
        token = await _login(client)
        resp = await client.put("/api/auth/profile", headers=_auth_headers(token), json={
            "display_name": "Admin",
            "email": "",
            "phone": "",
        })
        assert resp.status_code == 200


class TestChangePassword:
    @pytest.mark.asyncio
    async def test_change_password_success(self, client: AsyncClient, db: AsyncSession):
        token = await _login(client)
        resp = await client.put("/api/auth/password", headers=_auth_headers(token), json={
            "current_password": "admin123",
            "new_password": "NewAdm1n!",
        })
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert "access_token" in data
        assert "refresh_token" in data

        # Verify new password works
        new_token = data["access_token"]
        resp2 = await client.get("/api/auth/me", headers=_auth_headers(new_token))
        assert resp2.status_code == 200

        # Verify old password no longer works
        resp3 = await client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
        assert resp3.status_code == 401

        # Verify new password works for login
        resp4 = await client.post("/api/auth/login", json={"username": "admin", "password": "NewAdm1n!"})
        assert resp4.status_code == 200

    @pytest.mark.asyncio
    async def test_change_password_wrong_current(self, client: AsyncClient):
        token = await _login(client)
        resp = await client.put("/api/auth/password", headers=_auth_headers(token), json={
            "current_password": "wrongpassword",
            "new_password": "NewAdm1n!",
        })
        assert resp.status_code == 400
        assert "incorrect" in resp.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_change_password_weak_new(self, client: AsyncClient):
        token = await _login(client)
        resp = await client.put("/api/auth/password", headers=_auth_headers(token), json={
            "current_password": "admin123",
            "new_password": "weak",
        })
        assert resp.status_code == 400

    @pytest.mark.asyncio
    async def test_change_password_same_as_current(self, client: AsyncClient):
        token = await _login(client)

        # First change to a complex password
        resp0 = await client.put("/api/auth/password", headers=_auth_headers(token), json={
            "current_password": "admin123",
            "new_password": "NewAdm1n!",
        })
        assert resp0.status_code == 200
        new_token = resp0.json()["data"]["access_token"]

        # Try to set the same password again
        resp = await client.put("/api/auth/password", headers=_auth_headers(new_token), json={
            "current_password": "NewAdm1n!",
            "new_password": "NewAdm1n!",
        })
        assert resp.status_code == 400
        assert "different" in resp.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_change_password_history_rejected(self, client: AsyncClient):
        token = await _login(client)

        # First change: admin123 -> FirstP@ss1
        resp1 = await client.put("/api/auth/password", headers=_auth_headers(token), json={
            "current_password": "admin123",
            "new_password": "FirstP@ss1",
        })
        assert resp1.status_code == 200
        new_token = resp1.json()["data"]["access_token"]

        # Second change: FirstP@ss1 -> Sec0ndP@ss
        resp2 = await client.put("/api/auth/password", headers=_auth_headers(new_token), json={
            "current_password": "FirstP@ss1",
            "new_password": "Sec0ndP@ss",
        })
        assert resp2.status_code == 200
        newer_token = resp2.json()["data"]["access_token"]

        # Try to reuse FirstP@ss1 (in history) — meets complexity
        resp3 = await client.put("/api/auth/password", headers=_auth_headers(newer_token), json={
            "current_password": "Sec0ndP@ss",
            "new_password": "FirstP@ss1",
        })
        assert resp3.status_code == 400
        assert "recently" in resp3.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_change_password_creates_history_record(self, client: AsyncClient, db: AsyncSession):
        token = await _login(client)
        resp = await client.put("/api/auth/password", headers=_auth_headers(token), json={
            "current_password": "admin123",
            "new_password": "NewAdm1n!",
        })
        assert resp.status_code == 200

        # Check password_history table has an entry
        result = await db.execute(select(PasswordHistoryModel))
        history = result.scalars().all()
        assert len(history) >= 1

    @pytest.mark.asyncio
    async def test_change_password_updates_timestamp(self, client: AsyncClient, db: AsyncSession):
        token = await _login(client)
        resp = await client.put("/api/auth/password", headers=_auth_headers(token), json={
            "current_password": "admin123",
            "new_password": "NewAdm1n!",
        })
        assert resp.status_code == 200

        # Verify password_age_days reset to near 0
        new_token = resp.json()["data"]["access_token"]
        resp2 = await client.get("/api/auth/profile", headers=_auth_headers(new_token))
        age = resp2.json()["data"]["password_age_days"]
        assert age == 0

    @pytest.mark.asyncio
    async def test_change_password_requires_auth(self, client: AsyncClient):
        resp = await client.put("/api/auth/password", json={
            "current_password": "admin123",
            "new_password": "NewAdm1n!",
        })
        assert resp.status_code == 401
