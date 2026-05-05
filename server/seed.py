from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from server.auth.jwt import get_password_hash
from server.models import BotModel, PermissionModel, RoleModel, UserModel


async def seed_initial_data(db: AsyncSession) -> None:
    """Idempotent seed: only runs when users table is empty."""
    result = await db.execute(select(UserModel).limit(1))
    if result.scalar_one_or_none() is not None:
        return

    # --- Permissions (function) ---
    perms = {
        "p1": PermissionModel(id="p1", key="user.manage", name="用户管理", type="function"),
        "p2": PermissionModel(id="p2", key="role.manage", name="角色管理", type="function"),
        "p3": PermissionModel(id="p3", key="feedback.view", name="反馈查看", type="function"),
        "p4": PermissionModel(id="p4", key="feedback.review", name="反馈审核", type="function"),
        "p5": PermissionModel(id="p5", key="knowledge.*", name="知识库管理", type="function"),
    }

    # --- Permissions (bot) ---
    bot_perms = {
        "pb_a": PermissionModel(id="pb_a", key="bot.A", name="Bot A - 故障处理", type="bot"),
        "pb_b": PermissionModel(id="pb_b", key="bot.B", name="Bot B - 操作指南", type="bot"),
        "pb_c": PermissionModel(id="pb_c", key="bot.C", name="Bot C - 版本指南", type="bot"),
    }

    # --- Roles (with permissions wired before adding to session) ---
    r1 = RoleModel(id="r1", name="HQ IT Admin", description="总部IT管理员")
    r2 = RoleModel(id="r2", name="Store Manager", description="门店经理")
    r3 = RoleModel(id="r3", name="Helpdesk", description="客服支持")
    r4 = RoleModel(id="r4", name="System Admin", description="系统管理员（后台）")

    r4.permissions = [perms["p1"], perms["p2"], perms["p3"], perms["p4"], perms["p5"],
                       bot_perms["pb_a"], bot_perms["pb_b"], bot_perms["pb_c"]]
    # HQ IT Admin → Bot A + B + C + 反馈权限
    r1.permissions = [perms["p3"], perms["p4"],
                       bot_perms["pb_a"], bot_perms["pb_b"], bot_perms["pb_c"]]
    # Helpdesk → Bot A + B
    r3.permissions = [bot_perms["pb_a"], bot_perms["pb_b"]]
    # Store Manager → Bot B only
    r2.permissions = [bot_perms["pb_b"]]

    # --- Users (with roles wired before adding) ---
    admin_hash = get_password_hash("admin123")
    demo_hash = get_password_hash("password123")

    u_admin = UserModel(username="admin", password_hash=admin_hash, display_name="System Administrator")
    u_hq = UserModel(username="hq-admin", password_hash=demo_hash, display_name="HQ IT Admin")
    u_store = UserModel(username="store-manager", password_hash=demo_hash, display_name="Store Manager")
    u_helpdesk = UserModel(username="helpdesk", password_hash=demo_hash, display_name="Support Agent")

    u_admin.roles = [r4]
    u_hq.roles = [r1]
    u_store.roles = [r2]
    u_helpdesk.roles = [r3]

    # --- Bots ---
    bots = [
        BotModel(
            name="Bot A - 故障处理",
            key="A",
            description="基于历史工单和PRD文档，快速查找问题解决方案",
            icon="wrench",
            welcome_message="你好！我是故障处理助手，基于历史工单和文档为您查找解答。请描述你遇到的问题。",
        ),
        BotModel(
            name="Bot B - 操作指南",
            key="B",
            description="系统蓝图和用户手册查询，指导正确使用系统功能",
            icon="book",
            welcome_message="你好！我是操作指南助手，可以帮你查阅系统使用手册和操作流程。请问你想了解什么功能？",
        ),
        BotModel(
            name="Bot C - 版本指南",
            key="C",
            description="查询版本发布信息和终端版本",
            icon="tag",
            welcome_message="你好！我是版本指南助手，可以帮你查询版本发布记录和终端版本信息。请问你想了解哪个版本？",
        ),
    ]

    # Add all objects in one go
    db.add_all(list(perms.values()) + list(bot_perms.values()) + [r1, r2, r3, r4] + [u_admin, u_hq, u_store, u_helpdesk] + bots)
    await db.commit()
