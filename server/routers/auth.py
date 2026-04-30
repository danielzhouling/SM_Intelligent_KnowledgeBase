from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from server.auth.dependencies import get_current_user
from server.auth.jwt import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_password_hash,
    verify_password,
)
from server.auth.password_policy import (
    PASSWORD_HISTORY_LIMIT,
    check_password_in_history,
    get_password_age_days,
    validate_password_complexity,
)
from server.config import settings
from server.database import get_db
from server.models import PasswordHistoryModel, UserModel
from server.schemas.auth import (
    LoginRequest,
    PasswordChangeRequest,
    ProfileResponse,
    ProfileUpdateRequest,
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


@router.get("/profile")
async def get_profile(current_user: UserModel = Depends(get_current_user)):
    age_days = get_password_age_days(current_user.password_changed_at)
    return SuccessResponse(
        data=ProfileResponse(
            id=current_user.id,
            username=current_user.username,
            display_name=current_user.display_name,
            email=current_user.email or "",
            phone=current_user.phone or "",
            roles=[RoleInfo(id=r.id, name=r.name) for r in current_user.roles],
            password_age_days=age_days,
        ).model_dump()
    )


@router.put("/profile")
async def update_profile(
    body: ProfileUpdateRequest,
    current_user: UserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    current_user.display_name = body.display_name
    current_user.email = body.email
    current_user.phone = body.phone
    await db.commit()
    return SuccessResponse(data={"message": "Profile updated successfully"})


@router.put("/password")
async def change_password(
    body: PasswordChangeRequest,
    current_user: UserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(body.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    errors = validate_password_complexity(body.new_password)
    if errors:
        raise HTTPException(status_code=400, detail="; ".join(errors))

    if verify_password(body.new_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="New password must be different from current password")

    result = await db.execute(
        select(PasswordHistoryModel)
        .where(PasswordHistoryModel.user_id == current_user.id)
        .order_by(PasswordHistoryModel.created_at.desc())
        .limit(PASSWORD_HISTORY_LIMIT)
    )
    history_hashes = [h.password_hash for h in result.scalars().all()]

    if check_password_in_history(body.new_password, history_hashes):
        raise HTTPException(
            status_code=400,
            detail=f"Password was used recently. Choose a different password",
        )

    db.add(PasswordHistoryModel(user_id=current_user.id, password_hash=current_user.password_hash))

    current_user.password_hash = get_password_hash(body.new_password)
    current_user.password_changed_at = datetime.now(timezone.utc).replace(tzinfo=None)
    await db.commit()

    access_token = create_access_token(current_user.id)
    refresh_token = create_refresh_token(current_user.id)

    return SuccessResponse(
        data=TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_HOURS * 3600,
        ).model_dump()
    )
