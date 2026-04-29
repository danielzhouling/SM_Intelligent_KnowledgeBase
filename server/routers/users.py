from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from server.auth.dependencies import get_current_user, require_permissions
from server.auth.jwt import get_password_hash
from server.database import get_db
from server.models import RoleModel, UserModel
from server.schemas.common import SuccessResponse
from server.schemas.user import UserCreate, UserResponse, UserUpdate

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("")
async def list_users(
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
    _user: UserModel = Depends(require_permissions("user.manage")),
):
    """用户列表（支持分页）"""
    from server.schemas.common import PaginationParams, PaginatedData, PaginatedResponse

    p = PaginationParams(page=page, page_size=page_size)

    # Get total count
    count_result = await db.execute(select(UserModel))
    total = len(count_result.scalars().all())

    # Get paginated users
    result = await db.execute(
        select(UserModel).offset(p.offset).limit(p.page_size)
    )
    users = result.scalars().all()

    items = [
        {
            "id": u.id,
            "username": u.username,
            "display_name": u.display_name,
            "status": u.status,
            "roles": [{"id": r.id, "name": r.name} for r in u.roles],
            "created_at": u.created_at.isoformat() if u.created_at else "",
        }
        for u in users
    ]

    return SuccessResponse(data=PaginatedData(
        items=items,
        total=total,
        page=p.page,
        page_size=p.page_size,
    ).model_dump())


@router.get("/{user_id}")
async def get_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    _user: UserModel = Depends(require_permissions("user.manage")),
):
    result = await db.execute(select(UserModel).where(UserModel.id == user_id))
    u = result.scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    return SuccessResponse(data={
        "id": u.id,
        "username": u.username,
        "display_name": u.display_name,
        "status": u.status,
        "roles": [{"id": r.id, "name": r.name} for r in u.roles],
        "created_at": u.created_at.isoformat() if u.created_at else "",
    })


@router.post("")
async def create_user(
    body: UserCreate,
    db: AsyncSession = Depends(get_db),
    _user: UserModel = Depends(require_permissions("user.manage")),
):
    # Check username uniqueness
    existing = await db.execute(select(UserModel).where(UserModel.username == body.username))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username already exists")

    # Get roles
    role_result = await db.execute(select(RoleModel).where(RoleModel.id.in_(body.role_ids)))
    roles = list(role_result.scalars().all())

    new_user = UserModel(
        username=body.username,
        password_hash=get_password_hash(body.password),
        display_name=body.display_name,
        status=body.status,
        roles=roles,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user, ["roles"])

    return SuccessResponse(data={
        "id": new_user.id,
        "username": new_user.username,
        "display_name": new_user.display_name,
        "status": new_user.status,
        "roles": [{"id": r.id, "name": r.name} for r in new_user.roles],
        "created_at": new_user.created_at.isoformat() if new_user.created_at else "",
    })


@router.put("/{user_id}")
async def update_user(
    user_id: str,
    body: UserUpdate,
    db: AsyncSession = Depends(get_db),
    _user: UserModel = Depends(require_permissions("user.manage")),
):
    result = await db.execute(select(UserModel).where(UserModel.id == user_id))
    u = result.scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")

    if body.display_name is not None:
        u.display_name = body.display_name
    if body.status is not None:
        u.status = body.status
    if body.role_ids is not None:
        role_result = await db.execute(select(RoleModel).where(RoleModel.id.in_(body.role_ids)))
        u.roles = list(role_result.scalars().all())

    await db.commit()
    await db.refresh(u, ["roles"])

    return SuccessResponse(data={
        "id": u.id,
        "username": u.username,
        "display_name": u.display_name,
        "status": u.status,
        "roles": [{"id": r.id, "name": r.name} for r in u.roles],
        "created_at": u.created_at.isoformat() if u.created_at else "",
    })


@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    _user: UserModel = Depends(require_permissions("user.manage")),
):
    result = await db.execute(select(UserModel).where(UserModel.id == user_id))
    u = result.scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")

    await db.delete(u)
    await db.commit()
    return SuccessResponse(data={"message": "User deleted"})
