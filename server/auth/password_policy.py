import re
from datetime import datetime, timezone

import bcrypt

PASSWORD_MIN_LENGTH = 8
PASSWORD_HISTORY_LIMIT = 5
PASSWORD_EXPIRE_DAYS = 90
PASSWORD_WARN_DAYS = 7


def validate_password_complexity(password: str) -> list[str]:
    """Return list of error messages. Empty list means password is valid."""
    errors: list[str] = []
    if len(password) < PASSWORD_MIN_LENGTH:
        errors.append(f"Password must be at least {PASSWORD_MIN_LENGTH} characters")
    if not re.search(r"[A-Z]", password):
        errors.append("Password must contain at least one uppercase letter")
    if not re.search(r"[a-z]", password):
        errors.append("Password must contain at least one lowercase letter")
    if not re.search(r"[0-9]", password):
        errors.append("Password must contain at least one digit")
    if not re.search(r"[^A-Za-z0-9]", password):
        errors.append("Password must contain at least one special character")
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
