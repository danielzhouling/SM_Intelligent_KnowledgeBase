import pytest
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from server.auth.jwt import verify_password
from server.models import BotModel, PermissionModel, RoleModel, UserModel
from server.seed import seed_initial_data


@pytest.mark.asyncio
async def test_seed_creates_permissions(db: AsyncSession):
    await seed_initial_data(db)
    result = await db.execute(select(func.count()).select_from(PermissionModel))
    assert result.scalar() == 8  # 5 base + 3 bot permissions


@pytest.mark.asyncio
async def test_seed_creates_roles(db: AsyncSession):
    await seed_initial_data(db)
    result = await db.execute(select(func.count()).select_from(RoleModel))
    assert result.scalar() == 4


@pytest.mark.asyncio
async def test_seed_creates_users(db: AsyncSession):
    await seed_initial_data(db)
    result = await db.execute(select(func.count()).select_from(UserModel))
    assert result.scalar() == 4


@pytest.mark.asyncio
async def test_seed_creates_bots(db: AsyncSession):
    await seed_initial_data(db)
    result = await db.execute(select(func.count()).select_from(BotModel))
    assert result.scalar() == 3


@pytest.mark.asyncio
async def test_seed_admin_has_all_permissions(db: AsyncSession):
    await seed_initial_data(db)
    result = await db.execute(select(UserModel).where(UserModel.username == "admin"))
    admin = result.scalar_one()
    await db.refresh(admin, ["roles"])
    role = admin.roles[0]
    await db.refresh(role, ["permissions"])
    perm_keys = sorted(p.key for p in role.permissions)
    assert perm_keys == ["bot.A", "bot.B", "bot.C", "feedback.review", "feedback.view", "knowledge.*", "role.manage", "user.manage"]


@pytest.mark.asyncio
async def test_seed_is_idempotent(db: AsyncSession):
    await seed_initial_data(db)
    await seed_initial_data(db)  # run again
    result = await db.execute(select(func.count()).select_from(UserModel))
    assert result.scalar() == 4  # no duplicates


@pytest.mark.asyncio
async def test_seed_admin_password_verifiable(db: AsyncSession):
    await seed_initial_data(db)
    result = await db.execute(select(UserModel).where(UserModel.username == "admin"))
    admin = result.scalar_one()
    assert verify_password("admin123", admin.password_hash)


@pytest.mark.asyncio
async def test_seed_demo_passwords_verifiable(db: AsyncSession):
    await seed_initial_data(db)
    for username in ["hq-admin", "store-manager", "helpdesk"]:
        result = await db.execute(select(UserModel).where(UserModel.username == username))
        user = result.scalar_one()
        assert verify_password("password123", user.password_hash)


@pytest.mark.asyncio
async def test_seed_bots_in_draft_status(db: AsyncSession):
    await seed_initial_data(db)
    result = await db.execute(select(BotModel))
    bots = result.scalars().all()
    assert all(b.status == "draft" for b in bots)
    assert all(b.dify_api_key is None for b in bots)
