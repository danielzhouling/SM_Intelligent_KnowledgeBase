import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_check_no_auth(client: AsyncClient):
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_feishu_endpoints_require_auth(client: AsyncClient):
    for endpoint in [
        "/api/feishu/release-index",
        "/api/feishu/terminal-versions",
        "/api/feishu/search?keyword=test",
    ]:
        resp = await client.get(endpoint)
        assert resp.status_code == 401, f"{endpoint} should require auth"


@pytest.mark.asyncio
async def test_feishu_sync_status_with_auth(client: AsyncClient):
    login_resp = await client.post("/api/auth/login", json={
        "username": "admin",
        "password": "admin123",
    })
    token = login_resp.json()["data"]["access_token"]
    resp = await client.get("/api/feishu/sync/status", headers={
        "Authorization": f"Bearer {token}",
    })
    assert resp.status_code == 200
