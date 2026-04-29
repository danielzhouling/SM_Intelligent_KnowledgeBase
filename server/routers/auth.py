from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from server.auth.dependencies import get_current_user
from server.auth.jwt import (
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_password,
)
from server.config import settings
from server.database import get_db
from server.models import UserModel
from server.schemas.auth import (
    LoginRequest,
    RefreshRequest,
    RoleInfo,
    TokenResponse,
    UserMeResponse,
)
from server.schemas.common import SuccessResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login")
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UserModel).where(UserModel.username == body.username))
    user = result.scalar_one_or_none()

    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )

    if user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled",
        )

    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)

    return SuccessResponse(
        data=TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_HOURS * 3600,
        ).model_dump()
    )


@router.post("/logout")
async def logout(current_user: UserModel = Depends(get_current_user)):
    """用户登出（前端清除Token即可，后端无需处理）"""
    return SuccessResponse(data={"message": "Logged out successfully"})


@router.post("/refresh")
async def refresh_token(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    try:
        payload = decode_token(body.refresh_token)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
        )

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    # Verify user still exists and is active
    result = await db.execute(select(UserModel).where(UserModel.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    if user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled",
        )

    new_access_token = create_access_token(user_id)
    return SuccessResponse(
        data={"access_token": new_access_token, "token_type": "bearer"}
    )


@router.get("/me")
async def get_me(current_user: UserModel = Depends(get_current_user)):
    permissions = []
    for role in current_user.roles:
        for perm in role.permissions:
            if perm.key not in permissions:
                permissions.append(perm.key)

    return SuccessResponse(
        data=UserMeResponse(
            id=current_user.id,
            username=current_user.username,
            display_name=current_user.display_name,
            roles=[RoleInfo(id=r.id, name=r.name) for r in current_user.roles],
            permissions=permissions,
        ).model_dump()
    )
