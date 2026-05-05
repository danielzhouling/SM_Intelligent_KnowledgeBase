from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from server.auth.jwt import decode_token
from server.database import get_db
from server.models import UserModel

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> UserModel:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_token(token)
    except ValueError:
        raise credentials_exception

    if payload.get("type") != "access":
        raise credentials_exception

    user_id: str | None = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    result = await db.execute(select(UserModel).where(UserModel.id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise credentials_exception

    if user.status != "active":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is disabled")

    return user


# Menu to function permission mapping (for backward compatibility)
MENU_TO_FUNC_PERMISSIONS = {
    'menu.dashboard': [],  # Dashboard is view-only
    'menu.users': ['user.manage'],
    'menu.roles': ['role.manage'],
    'menu.bots': ['bot.manage'],
    'menu.feedback': ['feedback.view', 'feedback.review'],
    'menu.announcements': ['announcements.manage'],
}


def require_permissions(*required_keys: str):
    """Dependency factory: checks if current user has any of the required permissions.

    Menu permissions grant access to corresponding function operations:
    - menu.roles -> role.manage
    - menu.users -> user.manage
    - etc.

    knowledge.* wildcard grants access to knowledge.X permissions only.
    """
    async def checker(current_user: UserModel = Depends(get_current_user)) -> UserModel:
        user_permissions = set()
        for role in current_user.roles:
            for perm in role.permissions:
                user_permissions.add(perm.key)

        # Expand menu permissions to function permissions
        for menu_perm, func_perms in MENU_TO_FUNC_PERMISSIONS.items():
            if menu_perm in user_permissions:
                user_permissions.update(func_perms)

        has_wildcard = "knowledge.*" in user_permissions

        for key in required_keys:
            if key in user_permissions:
                return current_user
            # knowledge.* grants access to knowledge.X (but not other permissions)
            if has_wildcard and key.startswith("knowledge."):
                return current_user

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Permission denied. Required: {required_keys}",
        )
    return checker
