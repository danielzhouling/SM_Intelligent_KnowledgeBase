import pytest
from sqlalchemy.exc import IntegrityError

from server.models import (
    BotModel,
    ConversationModel,
    FeedbackModel,
    PermissionModel,
    RoleModel,
    SyncStatusModel,
    UserModel,
)

# Ensure all models are registered
from server.models import user_roles, role_permissions  # noqa: F401


@pytest.mark.asyncio
async def test_create_user(db):
    user = UserModel(username="testuser", password_hash="hashed", display_name="Test User")
    db.add(user)
    await db.commit()
    await db.refresh(user)

    assert user.id is not None
    assert user.username == "testuser"
    assert user.status == "active"


@pytest.mark.asyncio
async def test_user_unique_username(db):
    u1 = UserModel(username="unique_user", password_hash="h", display_name="U1")
    db.add(u1)
    await db.commit()

    u2 = UserModel(username="unique_user", password_hash="h", display_name="U2")
    db.add(u2)
    with pytest.raises(IntegrityError):
        await db.commit()


@pytest.mark.asyncio
async def test_user_role_relationship(db):
    user = UserModel(username="roleuser", password_hash="h", display_name="Role User")
    role = RoleModel(name="TestRole", description="A test role")
    user.roles.append(role)
    db.add_all([user, role])
    await db.commit()
    await db.refresh(user, ["roles"])

    assert len(user.roles) == 1
    assert user.roles[0].name == "TestRole"


@pytest.mark.asyncio
async def test_role_permission_relationship(db):
    role = RoleModel(name="PermRole", description="Role with perms")
    perm = PermissionModel(key="test.perm", name="Test Permission", type="function")
    role.permissions.append(perm)
    db.add_all([role, perm])
    await db.commit()
    await db.refresh(role, ["permissions"])

    assert len(role.permissions) == 1
    assert role.permissions[0].key == "test.perm"


@pytest.mark.asyncio
async def test_bot_unique_key(db):
    b1 = BotModel(name="Bot X", key="X")
    db.add(b1)
    await db.commit()

    b2 = BotModel(name="Bot X2", key="X")
    db.add(b2)
    with pytest.raises(IntegrityError):
        await db.commit()


@pytest.mark.asyncio
async def test_bot_default_status_draft(db):
    bot = BotModel(name="Bot Y", key="Y")
    db.add(bot)
    await db.commit()
    await db.refresh(bot)

    assert bot.status == "draft"
    assert bot.dify_api_key is None


@pytest.mark.asyncio
async def test_conversation_unique_constraint(db):
    user = UserModel(username="convuser", password_hash="h", display_name="Conv User")
    bot = BotModel(name="Bot Z", key="Z")
    db.add_all([user, bot])
    await db.commit()

    c1 = ConversationModel(
        user_id=user.id, bot_id=bot.id, dify_conversation_id="dify-conv-1", title="Test"
    )
    db.add(c1)
    await db.commit()

    c2 = ConversationModel(
        user_id=user.id, bot_id=bot.id, dify_conversation_id="dify-conv-1", title="Duplicate"
    )
    db.add(c2)
    with pytest.raises(IntegrityError):
        await db.commit()


@pytest.mark.asyncio
async def test_feedback_creation(db):
    user = UserModel(username="fbuser", password_hash="h", display_name="FB User")
    bot = BotModel(name="Bot FB", key="FB")
    db.add_all([user, bot])
    await db.commit()

    fb = FeedbackModel(
        user_id=user.id,
        bot_id=bot.id,
        message_id="msg-001",
        query="test question",
        answer="test answer",
        rating="useful",
    )
    db.add(fb)
    await db.commit()
    await db.refresh(fb)

    assert fb.status == "pending"
    assert fb.rating == "useful"
    assert fb.review_result is None


@pytest.mark.asyncio
async def test_sync_status_creation(db):
    sync = SyncStatusModel(collection="bot_c_versions", records_synced=42, status="success")
    db.add(sync)
    await db.commit()
    await db.refresh(sync)

    assert sync.records_synced == 42
    assert sync.status == "success"
