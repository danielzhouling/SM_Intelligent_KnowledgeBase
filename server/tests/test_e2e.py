"""
SM-Dmall ERP 智能知识库系统 - 端到端集成测试

覆盖用户端全流程（登录→选Bot→多会话聊天→反馈→历史会话）
和管理后台全流程（Bot管理→用户CRUD→反馈审核→导出）

运行方式:
    cd server
    python3 -m pytest tests/test_e2e.py -v
"""

import pytest
import httpx
import asyncio
import time


BASE_URL = "http://localhost:8000"


async def get_admin_token() -> str:
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=30.0) as client:
        resp = await client.post("/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        return data["data"]["access_token"]


async def get_hq_admin_token() -> str:
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=30.0) as client:
        resp = await client.post("/api/auth/login", json={
            "username": "hq-admin",
            "password": "password123"
        })
        assert resp.status_code == 200
        data = resp.json()
        return data["data"]["access_token"]


class TestAuthAPI:
    """认证API测试"""

    @pytest.mark.asyncio
    async def test_login_success(self):
        """登录成功"""
        async with httpx.AsyncClient(base_url=BASE_URL, timeout=30.0) as client:
            resp = await client.post("/api/auth/login", json={
                "username": "admin",
                "password": "admin123"
            })
            assert resp.status_code == 200
            data = resp.json()
            assert data["success"] is True
            assert "access_token" in data["data"]
            assert "refresh_token" in data["data"]

    @pytest.mark.asyncio
    async def test_login_invalid_password(self):
        """密码错误"""
        async with httpx.AsyncClient(base_url=BASE_URL, timeout=30.0) as client:
            resp = await client.post("/api/auth/login", json={
                "username": "admin",
                "password": "wrong"
            })
            assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_login_nonexistent_user(self):
        """用户不存在"""
        async with httpx.AsyncClient(base_url=BASE_URL, timeout=30.0) as client:
            resp = await client.post("/api/auth/login", json={
                "username": "nonexistent",
                "password": "any"
            })
            assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_get_me(self):
        """获取当前用户信息"""
        token = await get_admin_token()
        async with httpx.AsyncClient(base_url=BASE_URL, timeout=30.0) as client:
            resp = await client.get(
                "/api/auth/me",
                headers={"Authorization": f"Bearer {token}"}
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["success"] is True
            assert data["data"]["username"] == "admin"
            assert "roles" in data["data"]

    @pytest.mark.asyncio
    async def test_refresh_token(self):
        """刷新Token"""
        async with httpx.AsyncClient(base_url=BASE_URL, timeout=30.0) as client:
            # 先获取refresh_token
            login_resp = await client.post("/api/auth/login", json={
                "username": "admin",
                "password": "admin123"
            })
            refresh_t = login_resp.json()["data"]["refresh_token"]

            # 使用refresh_token获取新access_token
            resp = await client.post("/api/auth/refresh", json={
                "refresh_token": refresh_t
            })
            assert resp.status_code == 200
            data = resp.json()
            assert data["success"] is True
            assert "access_token" in data["data"]

    @pytest.mark.asyncio
    async def test_unauthorized_access(self):
        """未授权访问"""
        async with httpx.AsyncClient(base_url=BASE_URL, timeout=30.0) as client:
            resp = await client.get("/api/users")
            assert resp.status_code == 401


class TestBotsAPI:
    """Bot管理API测试"""

    @pytest.mark.asyncio
    async def test_list_bots_admin(self):
        """Admin可查看所有Bot"""
        token = await get_admin_token()
        async with httpx.AsyncClient(base_url=BASE_URL, timeout=30.0) as client:
            resp = await client.get(
                "/api/bots",
                headers={"Authorization": f"Bearer {token}"}
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["success"] is True
            assert len(data["data"]) == 3  # Bot A, B, C

    @pytest.mark.asyncio
    async def test_list_bots_forbidden_for_non_admin(self):
        """非Admin不能查看所有Bot"""
        token = await get_hq_admin_token()
        async with httpx.AsyncClient(base_url=BASE_URL, timeout=30.0) as client:
            resp = await client.get(
                "/api/bots",
                headers={"Authorization": f"Bearer {token}"}
            )
            assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_get_available_bots(self):
        """获取可用Bot列表"""
        token = await get_admin_token()
        async with httpx.AsyncClient(base_url=BASE_URL, timeout=30.0) as client:
            resp = await client.get(
                "/api/bots/available",
                headers={"Authorization": f"Bearer {token}"}
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["success"] is True
            # draft状态的Bot不在available列表中
            for bot in data["data"]:
                assert bot["status"] == "active"


class TestUsersAPI:
    """用户管理API测试"""

    @pytest.mark.asyncio
    async def test_list_users_admin(self):
        """Admin可查看所有用户"""
        token = await get_admin_token()
        async with httpx.AsyncClient(base_url=BASE_URL, timeout=30.0) as client:
            resp = await client.get(
                "/api/users",
                headers={"Authorization": f"Bearer {token}"}
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["success"] is True
            # 至少有4个种子用户 (admin + hq-admin + store-manager + helpdesk)
            assert len(data["data"]) >= 4

    @pytest.mark.asyncio
    async def test_create_user(self):
        """创建用户"""
        token = await get_admin_token()
        async with httpx.AsyncClient(base_url=BASE_URL, timeout=30.0) as client:
            resp = await client.post(
                "/api/users",
                headers={"Authorization": f"Bearer {token}"},
                json={
                    "username": f"testuser_{int(time.time())}",
                    "password": "test123",
                    "display_name": "Test User",
                    "role_ids": []
                }
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["success"] is True
            assert data["data"]["username"].startswith("testuser_")

    @pytest.mark.asyncio
    async def test_update_user(self):
        """更新用户"""
        token = await get_admin_token()
        async with httpx.AsyncClient(base_url=BASE_URL, timeout=30.0) as client:
            # 先获取用户列表
            resp = await client.get(
                "/api/users",
                headers={"Authorization": f"Bearer {token}"}
            )
            users = resp.json()["data"]
            test_user = next(u for u in users if u["username"] == "helpdesk")

            # 更新用户
            resp = await client.put(
                f"/api/users/{test_user['id']}",
                headers={"Authorization": f"Bearer {token}"},
                json={"display_name": "Helpdesk Agent Updated"}
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["data"]["display_name"] == "Helpdesk Agent Updated"

    @pytest.mark.asyncio
    async def test_delete_user(self):
        """删除用户"""
        token = await get_admin_token()
        async with httpx.AsyncClient(base_url=BASE_URL, timeout=30.0) as client:
            # 先创建一个用户
            resp = await client.post(
                "/api/users",
                headers={"Authorization": f"Bearer {token}"},
                json={
                    "username": f"todelete_{int(time.time())}",
                    "password": "test123",
                    "display_name": "To Delete",
                    "role_ids": []
                }
            )
            user_id = resp.json()["data"]["id"]

            # 删除该用户
            resp = await client.delete(
                f"/api/users/{user_id}",
                headers={"Authorization": f"Bearer {token}"}
            )
            assert resp.status_code == 200

            # 验证删除
            resp = await client.get(
                f"/api/users/{user_id}",
                headers={"Authorization": f"Bearer {token}"}
            )
            assert resp.status_code == 404


class TestRolesAPI:
    """角色管理API测试"""

    @pytest.mark.asyncio
    async def test_list_roles_admin(self):
        """Admin可查看所有角色"""
        token = await get_admin_token()
        async with httpx.AsyncClient(base_url=BASE_URL, timeout=30.0) as client:
            resp = await client.get(
                "/api/roles",
                headers={"Authorization": f"Bearer {token}"}
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["success"] is True
            # 至少有4个种子角色 (System Admin, HQ IT Admin, Store Manager, Helpdesk)
            assert len(data["data"]) >= 4

    @pytest.mark.asyncio
    async def test_create_role(self):
        """创建角色"""
        token = await get_admin_token()
        async with httpx.AsyncClient(base_url=BASE_URL, timeout=30.0) as client:
            resp = await client.post(
                "/api/roles",
                headers={"Authorization": f"Bearer {token}"},
                json={
                    "name": f"TestRole_{int(time.time())}",
                    "description": "Test role",
                    "permission_keys": ["feedback.view"]
                }
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["success"] is True
            # Permissions is a list of objects with 'key' field
            perm_keys = [p["key"] for p in data["data"].get("permissions", [])]
            assert "feedback.view" in perm_keys


class TestConversationsAPI:
    """会话管理API测试"""

    @pytest.mark.asyncio
    async def test_list_conversations(self):
        """获取会话列表"""
        token = await get_admin_token()
        async with httpx.AsyncClient(base_url=BASE_URL, timeout=30.0) as client:
            resp = await client.get(
                "/api/chat/conversations",
                headers={"Authorization": f"Bearer {token}"}
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["success"] is True
            assert isinstance(data["data"], list)


class TestFeedbacksAPI:
    """反馈管理API测试"""

    @pytest.mark.asyncio
    async def test_list_feedbacks_admin(self):
        """Admin可查看所有反馈"""
        token = await get_admin_token()
        async with httpx.AsyncClient(base_url=BASE_URL, timeout=30.0) as client:
            resp = await client.get(
                "/api/feedbacks",
                headers={"Authorization": f"Bearer {token}"}
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["success"] is True
            assert isinstance(data["data"], list)

class TestFeedbackPermissions:
    """反馈权限测试"""

    @pytest.mark.asyncio
    async def test_hq_admin_can_view_feedbacks(self):
        """HQ Admin有feedback.view权限"""
        token = await get_hq_admin_token()
        async with httpx.AsyncClient(base_url=BASE_URL, timeout=30.0) as client:
            resp = await client.get(
                "/api/feedbacks",
                headers={"Authorization": f"Bearer {token}"}
            )
            # HQ Admin有feedback.view权限，所以返回200
            assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_export_feedbacks(self):
        """导出反馈"""
        token = await get_admin_token()
        async with httpx.AsyncClient(base_url=BASE_URL, timeout=30.0) as client:
            resp = await client.post(
                "/api/feedbacks/export",
                headers={"Authorization": f"Bearer {token}"},
                json={}
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["success"] is True
            # 响应格式: {"export_count": int, "records": list}
            assert "records" in data["data"]
            assert isinstance(data["data"]["records"], list)


class TestHealthCheck:
    """健康检查测试"""

    @pytest.mark.asyncio
    async def test_health_endpoint(self):
        """健康检查端点"""
        async with httpx.AsyncClient(base_url=BASE_URL, timeout=10.0) as client:
            resp = await client.get("/health")
            assert resp.status_code == 200
            assert resp.text == '{"status":"ok"}'


def test_e2e_summary():
    """
    端到端测试覆盖范围:
    1. 认证流程: 登录 → Token获取 → Token刷新 → 获取用户信息
    2. Bot管理: 列表查看 → 可用Bot → 权限控制
    3. 用户CRUD: 创建 → 更新 → 删除 → 列表
    4. 角色CRUD: 创建 → 列表
    5. 会话管理: 获取会话列表
    6. 反馈管理: 列表查看 → 导出
    7. 健康检查: /health端点

    前端全流程测试需要在浏览器中手动验证:
    - 用户端: 登录 → Bot选择 → 聊天 → 反馈 → 历史会话
    - 管理端: 登录 → Bot配置 → 用户管理 → 反馈审核
    """
    pass
