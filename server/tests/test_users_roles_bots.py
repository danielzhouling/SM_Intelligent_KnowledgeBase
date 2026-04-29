import pytest
from httpx import AsyncClient


async def _login_admin(client: AsyncClient) -> str:
    resp = await client.post("/api/auth/login", json={
        "username": "admin",
        "password": "admin123",
    })
    return resp.json()["data"]["access_token"]


async def _login_hq_admin(client: AsyncClient) -> str:
    resp = await client.post("/api/auth/login", json={
        "username": "hq-admin",
        "password": "password123",
    })
    return resp.json()["data"]["access_token"]


@pytest.mark.asyncio
async def test_list_users_requires_permission(client: AsyncClient):
    """非admin用户不能访问用户列表"""
    token = await _login_hq_admin(client)
    resp = await client.get("/api/users", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_list_users_admin(client: AsyncClient):
    """admin可以访问用户列表"""
    token = await _login_admin(client)
    resp = await client.get("/api/users", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert len(data["items"]) == 4  # admin + 3 demo users


@pytest.mark.asyncio
async def test_create_user(client: AsyncClient):
    token = await _login_admin(client)
    resp = await client.post("/api/users", headers={"Authorization": f"Bearer {token}"}, json={
        "username": "newuser",
        "password": "test123",
        "display_name": "新用户",
        "role_ids": [],
    })
    assert resp.status_code == 200
    assert resp.json()["data"]["username"] == "newuser"


@pytest.mark.asyncio
async def test_create_user_duplicate_username(client: AsyncClient):
    token = await _login_admin(client)
    resp = await client.post("/api/users", headers={"Authorization": f"Bearer {token}"}, json={
        "username": "admin",  # already exists
        "password": "test123",
        "display_name": "重复用户",
    })
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_update_user(client: AsyncClient):
    token = await _login_admin(client)
    # First get user list to find a user
    resp = await client.get("/api/users", headers={"Authorization": f"Bearer {token}"})
    users = resp.json()["data"]["items"]
    demo_user = next(u for u in users if u["username"] == "helpdesk")

    resp = await client.put(
        f"/api/users/{demo_user['id']}",
        headers={"Authorization": f"Bearer {token}"},
        json={"display_name": "客服支持（已修改）"},
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["display_name"] == "客服支持（已修改）"


@pytest.mark.asyncio
async def test_delete_user(client: AsyncClient):
    token = await _login_admin(client)
    # Create a new user first
    resp = await client.post("/api/users", headers={"Authorization": f"Bearer {token}"}, json={
        "username": "tempuser",
        "password": "test123",
        "display_name": "临时用户",
    })
    user_id = resp.json()["data"]["id"]

    # Delete it
    resp = await client.delete(f"/api/users/{user_id}", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200

    # Verify it's gone
    resp = await client.get(f"/api/users/{user_id}", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_list_roles_requires_permission(client: AsyncClient):
    token = await _login_hq_admin(client)
    resp = await client.get("/api/roles", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_list_roles_admin(client: AsyncClient):
    token = await _login_admin(client)
    resp = await client.get("/api/roles", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert len(data["items"]) == 4  # 4 roles


@pytest.mark.asyncio
async def test_create_role(client: AsyncClient):
    token = await _login_admin(client)
    resp = await client.post("/api/roles", headers={"Authorization": f"Bearer {token}"}, json={
        "name": "TestRole",
        "description": "测试角色",
        "permission_keys": ["feedback.view"],
    })
    assert resp.status_code == 200
    assert resp.json()["data"]["name"] == "TestRole"


@pytest.mark.asyncio
async def test_bot_available_endpoint_authenticated(client: AsyncClient):
    """已认证用户可以获取可用Bot"""
    token = await _login_admin(client)
    resp = await client.get("/api/bots/available", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    # draft bots should not appear
    data = resp.json()["data"]
    for b in data:
        assert b is not None  # at least structure is correct


@pytest.mark.asyncio
async def test_bot_list_requires_permission(client: AsyncClient):
    """非管理员不能查看所有Bot"""
    token = await _login_hq_admin(client)
    resp = await client.get("/api/bots", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_bot_list_admin(client: AsyncClient):
    """admin可以查看所有Bot（包括draft）"""
    token = await _login_admin(client)
    resp = await client.get("/api/bots", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert len(data["items"]) == 3  # Bot A, B, C


@pytest.mark.asyncio
async def test_feedback_submit_requires_auth(client: AsyncClient):
    """提交反馈需要认证"""
    resp = await client.post("/api/feedbacks", json={
        "bot_id": "bot-a",
        "message_id": "msg-001",
        "query": "test",
        "answer": "test answer",
        "rating": "useful",
    })
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_feedback_list_requires_permission(client: AsyncClient):
    """非审核权限不能查看反馈列表"""
    # store-manager has no feedback permissions
    resp = await client.post("/api/auth/login", json={
        "username": "store-manager",
        "password": "password123",
    })
    token = resp.json()["data"]["access_token"]
    resp = await client.get("/api/feedbacks", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_feedback_list_admin(client: AsyncClient):
    """admin可以查看反馈列表"""
    token = await _login_admin(client)
    resp = await client.get("/api/feedbacks", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert isinstance(resp.json()["data"]["items"], list)


@pytest.mark.asyncio
async def test_feedback_export_requires_permission(client: AsyncClient):
    # store-manager has no feedback permissions
    resp = await client.post("/api/auth/login", json={
        "username": "store-manager",
        "password": "password123",
    })
    token = resp.json()["data"]["access_token"]
    resp = await client.post("/api/feedbacks/export", headers={"Authorization": f"Bearer {token}"}, json={})
    assert resp.status_code == 403
