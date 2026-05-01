import re
from datetime import datetime, timezone

import bcrypt

PASSWORD_MIN_LENGTH = 6
PASSWORD_HISTORY_LIMIT = 5
PASSWORD_EXPIRE_DAYS = 90
PASSWORD_WARN_DAYS = 7


def validate_password_complexity(password: str) -> list[str]:
    """Return list of error messages. Empty list means password is valid."""
    errors: list[str] = []
    if len(password) < PASSWORD_MIN_LENGTH:
        errors.append(f"Password must be at least {PASSWORD_MIN_LENGTH} characters")
    return errors


def check_password_in_history(plain_password: str, history_hashes: list[str]) -> bool:
    """Return True if the plain password matches any hash in history (should be rejected)."""
    for hashed in history_hashes:
        if bcrypt.checkpw(plain_password.encode("utf-8"), hashed.encode("utf-8")):
            return True
    return False


def get_password_age_days(password_changed_at: datetime | None) -> int | None:
    """Return password age in days, or None if never changed."""
    if password_changed_at is None:
        return None
    now = datetime.now(timezone.utc)
    changed = password_changed_at.replace(tzinfo=timezone.utc) if password_changed_at.tzinfo is None else password_changed_at
    return (now - changed).days


def is_password_expired(password_changed_at: datetime | None) -> bool:
    age = get_password_age_days(password_changed_at)
    return age is not None and age > PASSWORD_EXPIRE_DAYS


def is_password_expiring_soon(password_changed_at: datetime | None) -> bool:
    age = get_password_age_days(password_changed_at)
    return age is not None and (PASSWORD_EXPIRE_DAYS - PASSWORD_WARN_DAYS) < age <= PASSWORD_EXPIRE_DAYS
