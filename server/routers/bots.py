from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from server.auth.dependencies import get_current_user, require_permissions
from server.config import settings
from server.database import get_db
from server.models import BotModel, PermissionModel, UserModel
from server.schemas.common import SuccessResponse
from server.schemas.bot import BotCreate, BotDifyConfig, BotUpdate

router = APIRouter(prefix="/api/bots", tags=["bots"])


# --- Admin routes (require user.manage) ---

@router.get("")
async def list_bots(
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
    _user: UserModel = Depends(require_permissions("user.manage")),
):
    """Bot列表（管理后台可见所有状态，支持分页）"""
    from server.schemas.common import PaginationParams, PaginatedData

    p = PaginationParams(page=page, page_size=page_size)

    # Get total count
    count_result = await db.execute(select(BotModel))
    total = len(count_result.scalars().all())

    # Get paginated bots
    result = await db.execute(
        select(BotModel).offset(p.offset).limit(p.page_size)
    )
    bots = result.scalars().all()

    items = [
        {
            "id": b.id,
            "name": b.name,
            "key": b.key,
            "description": b.description,
            "icon": b.icon,
            "welcome_message": b.welcome_message,
            "status": b.status,
            "has_dify_key": b.dify_api_key is not None,
            "created_at": b.created_at.isoformat() if b.created_at else "",
        }
        for b in bots
    ]

    return SuccessResponse(data=PaginatedData(
        items=items,
        total=total,
        page=p.page,
        page_size=p.page_size,
    ).model_dump())


@router.post("")
async def create_bot(
    body: BotCreate,
    db: AsyncSession = Depends(get_db),
    _user: UserModel = Depends(require_permissions("user.manage")),
):
    """第一步：创建Bot基本信息，status=draft"""
    existing = await db.execute(select(BotModel).where(BotModel.key == body.key))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Bot key already exists")

    new_bot = BotModel(
        name=body.name,
        key=body.key,
        description=body.description,
        icon=body.icon,
        welcome_message=body.welcome_message,
        status="draft",
    )
    db.add(new_bot)
    await db.flush()

    # Auto-create bot permission
    perm = PermissionModel(
        key=f"bot.{body.key}",
        name=f"Bot {body.key} 访问权限",
        type="bot",
    )
    db.add(perm)

    await db.commit()
    await db.refresh(new_bot)

    return SuccessResponse(data={
        "id": new_bot.id,
        "name": new_bot.name,
        "key": new_bot.key,
        "description": new_bot.description,
        "icon": new_bot.icon,
        "welcome_message": new_bot.welcome_message,
        "status": new_bot.status,
        "created_at": new_bot.created_at.isoformat() if new_bot.created_at else "",
    })


@router.put("/{bot_id}")
async def update_bot(
    bot_id: str,
    body: BotUpdate,
    db: AsyncSession = Depends(get_db),
    _user: UserModel = Depends(require_permissions("user.manage")),
):
    result = await db.execute(select(BotModel).where(BotModel.id == bot_id))
    b = result.scalar_one_or_none()
    if not b:
        raise HTTPException(status_code=404, detail="Bot not found")

    if body.name is not None:
        b.name = body.name
    if body.description is not None:
        b.description = body.description
    if body.icon is not None:
        b.icon = body.icon
    if body.welcome_message is not None:
        b.welcome_message = body.welcome_message

    await db.commit()
    await db.refresh(b)

    return SuccessResponse(data={
        "id": b.id,
        "name": b.name,
        "key": b.key,
        "description": b.description,
        "icon": b.icon,
        "welcome_message": b.welcome_message,
        "status": b.status,
        "has_dify_key": b.dify_api_key is not None,
        "created_at": b.created_at.isoformat() if b.created_at else "",
    })


@router.put("/{bot_id}/dify")
async def configure_dify(
    bot_id: str,
    body: BotDifyConfig,
    db: AsyncSession = Depends(get_db),
    _user: UserModel = Depends(require_permissions("user.manage")),
):
    """第二步：配置Dify API Key，测试通过后status变更为active"""
    result = await db.execute(select(BotModel).where(BotModel.id == bot_id))
    b = result.scalar_one_or_none()
    if not b:
        raise HTTPException(status_code=404, detail="Bot not found")

    b.dify_api_key = body.dify_api_key
    b.status = "active"
    await db.commit()
    await db.refresh(b)

    return SuccessResponse(data={
        "id": b.id,
        "status": b.status,
        "has_dify_key": b.dify_api_key is not None,
    })


@router.post("/{bot_id}/test")
async def test_dify_connection(
    bot_id: str,
    db: AsyncSession = Depends(get_db),
    _user: UserModel = Depends(require_permissions("user.manage")),
):
    """测试Dify连接"""
    import httpx

    result = await db.execute(select(BotModel).where(BotModel.id == bot_id))
    b = result.scalar_one_or_none()
    if not b:
        raise HTTPException(status_code=404, detail="Bot not found")

    if not b.dify_api_key:
        raise HTTPException(status_code=400, detail="Dify API Key not configured")

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{settings.DIFY_API_BASE_URL}/chat-messages",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {b.dify_api_key}",
                },
                json={
                    "inputs": {},
                    "query": "hello",
                    "response_mode": "blocking",
                    "user": "system-test",
                },
                timeout=30.0,
            )
            if resp.status_code == 200:
                return SuccessResponse(data={"success": True, "message": "连接成功"})
            else:
                return SuccessResponse(data={"success": False, "message": f"连接失败: {resp.text}"})
    except Exception as e:
        return SuccessResponse(data={"success": False, "message": f"连接失败: {str(e)}"})


@router.patch("/{bot_id}/status")
async def toggle_bot_status(
    bot_id: str,
    db: AsyncSession = Depends(get_db),
    _user: UserModel = Depends(require_permissions("user.manage")),
):
    """切换Bot状态 active <-> disabled"""
    result = await db.execute(select(BotModel).where(BotModel.id == bot_id))
    b = result.scalar_one_or_none()
    if not b:
        raise HTTPException(status_code=404, detail="Bot not found")

    if b.status == "active":
        b.status = "disabled"
    elif b.status == "disabled":
        b.status = "active"
    else:
        raise HTTPException(status_code=400, detail="Cannot toggle status for draft bot")

    await db.commit()
    await db.refresh(b)

    return SuccessResponse(data={"id": b.id, "status": b.status})


@router.delete("/{bot_id}")
async def delete_bot(
    bot_id: str,
    db: AsyncSession = Depends(get_db),
    _user: UserModel = Depends(require_permissions("user.manage")),
):
    """删除Bot（关联的feedbacks会级联删除）"""
    result = await db.execute(select(BotModel).where(BotModel.id == bot_id))
    b = result.scalar_one_or_none()
    if not b:
        raise HTTPException(status_code=404, detail="Bot not found")

    await db.delete(b)
    await db.commit()

    return SuccessResponse(data={"id": bot_id, "deleted": True})


# --- User-facing route (authenticated) ---

@router.get("/available")
async def get_available_bots(
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """用户端：获取可用的Bot列表（仅active）"""
    # Get user's bot permissions
    user_bot_perms = set()
    for role in current_user.roles:
        for perm in role.permissions:
            if perm.type == "bot" and perm.key.startswith("bot."):
                user_bot_perms.add(perm.key)

    result = await db.execute(select(BotModel).where(BotModel.status == "active"))
    bots = result.scalars().all()

    available = []
    for b in bots:
        # Check if user has permission for this bot
        if "bot.*" in user_bot_perms or f"bot.{b.key}" in user_bot_perms:
            available.append({
                "id": b.id,
                "name": b.name,
                "key": b.key,
                "description": b.description,
                "icon": b.icon,
                "welcome_message": b.welcome_message,
            })

    return SuccessResponse(data=available)
