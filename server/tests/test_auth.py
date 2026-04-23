import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from server.auth.jwt import (
    ALGORITHM,
    create_access_token,
    create_refresh_token,
    decode_token,
    get_password_hash,
    verify_password,
)
from server.models import PermissionModel, RoleModel, UserModel


@pytest.mark.asyncio
async def test_password_hashing():
    hashed = get_password_hash("mypassword")
    assert hashed != "mypassword"
    assert verify_password("mypassword", hashed)
    assert not verify_password("wrongpassword", hashed)


@pytest.mark.asyncio
async def test_create_and_decode_access_token():
    token = create_access_token("user-123")
    payload = decode_token(token)
    assert payload["sub"] == "user-123"
    assert payload["type"] == "access"
    assert "exp" in payload


@pytest.mark.asyncio
async def test_create_and_decode_refresh_token():
    token = create_refresh_token("user-456")
    payload = decode_token(token)
    assert payload["sub"] == "user-456"
    assert payload["type"] == "refresh"


@pytest.mark.asyncio
async def test_decode_invalid_token():
    with pytest.raises(ValueError, match="Invalid or expired token"):
        decode_token("invalid.token.here")


@pytest.mark.asyncio
async def test_decode_expired_token():
    import jose.jwt as jwt_module
    from datetime import datetime, timedelta, timezone

    expired_payload = {
        "sub": "user-789",
        "type": "access",
        "exp": datetime.now(timezone.utc) - timedelta(hours=1),
    }
    from server.config import settings

    expired_token = jwt_module.encode(expired_payload, settings.JWT_SECRET, algorithm=ALGORITHM)
    with pytest.raises(ValueError, match="Invalid or expired token"):
        decode_token(expired_token)
