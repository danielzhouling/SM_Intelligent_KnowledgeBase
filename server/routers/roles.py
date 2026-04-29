from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from server.auth.dependencies import get_current_user, require_permissions
from server.database import get_db
from server.models import PermissionModel, RoleModel, UserModel
from server.schemas.common import SuccessResponse
from server.schemas.role import RoleCreate, RoleUpdate

router = APIRouter(prefix="/api/roles", tags=["roles"])


@router.get("")
async def list_roles(
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
    _user: UserModel = Depends(require_permissions("role.manage")),
):
    """角色列表（支持分页）"""
    from server.schemas.common import PaginationParams, PaginatedData

    p = PaginationParams(page=page, page_size=page_size)

    # Get total count
    count_result = await db.execute(select(RoleModel))
    total = len(count_result.scalars().all())

    # Get paginated roles with relations
    result = await db.execute(
        select(RoleModel)
        .options(selectinload(RoleModel.permissions), selectinload(RoleModel.users))
        .offset(p.offset)
        .limit(p.page_size)
    )
    roles = result.scalars().all()

    items = [
        {
            "id": r.id,
            "name": r.name,
            "description": r.description,
            "permissions": [{"id": p.id, "key": p.key, "name": p.name, "type": p.type} for p in r.permissions],
            "user_count": len(r.users),
            "created_at": r.created_at.isoformat() if r.created_at else "",
        }
        for r in roles
    ]

    return SuccessResponse(data=PaginatedData(
        items=items,
        total=total,
        page=p.page,
        page_size=p.page_size,
    ).model_dump())


@router.post("")
async def create_role(
    body: RoleCreate,
    db: AsyncSession = Depends(get_db),
    _user: UserModel = Depends(require_permissions("role.manage")),
):
    # Check name uniqueness
    existing = await db.execute(select(RoleModel).where(RoleModel.name == body.name))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Role name already exists")

    perm_result = await db.execute(select(PermissionModel).where(PermissionModel.key.in_(body.permission_keys)))
    perms = list(perm_result.scalars().all())

    new_role = RoleModel(name=body.name, description=body.description, permissions=perms)
    db.add(new_role)
    await db.commit()
    await db.refresh(new_role, ["permissions"])

    return SuccessResponse(data={
        "id": new_role.id,
        "name": new_role.name,
        "description": new_role.description,
        "permissions": [{"id": p.id, "key": p.key, "name": p.name, "type": p.type} for p in new_role.permissions],
        "user_count": 0,
        "created_at": new_role.created_at.isoformat() if new_role.created_at else "",
    })


@router.put("/{role_id}")
async def update_role(
    role_id: str,
    body: RoleUpdate,
    db: AsyncSession = Depends(get_db),
    _user: UserModel = Depends(require_permissions("role.manage")),
):
    result = await db.execute(
        select(RoleModel).where(RoleModel.id == role_id).options(selectinload(RoleModel.permissions))
    )
    r = result.scalar_one_or_none()
    if not r:
        raise HTTPException(status_code=404, detail="Role not found")

    if body.name is not None:
        r.name = body.name
    if body.description is not None:
        r.description = body.description
    if body.permission_keys is not None:
        perm_result = await db.execute(
            select(PermissionModel).where(PermissionModel.key.in_(body.permission_keys))
        )
        r.permissions = list(perm_result.scalars().all())

    await db.commit()
    await db.refresh(r, ["permissions"])

    return SuccessResponse(data={
        "id": r.id,
        "name": r.name,
        "description": r.description,
        "permissions": [{"id": p.id, "key": p.key, "name": p.name, "type": p.type} for p in r.permissions],
        "created_at": r.created_at.isoformat() if r.created_at else "",
    })


@router.delete("/{role_id}")
async def delete_role(
    role_id: str,
    db: AsyncSession = Depends(get_db),
    _user: UserModel = Depends(require_permissions("role.manage")),
):
    result = await db.execute(select(RoleModel).where(RoleModel.id == role_id))
    r = result.scalar_one_or_none()
    if not r:
        raise HTTPException(status_code=404, detail="Role not found")

    await db.delete(r)
    await db.commit()
    return SuccessResponse(data={"message": "Role deleted"})
