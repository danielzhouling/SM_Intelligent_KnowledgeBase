import pytest

from server.auth.password_policy import (
    PASSWORD_EXPIRE_DAYS,
    PASSWORD_HISTORY_LIMIT,
    PASSWORD_MIN_LENGTH,
    PASSWORD_WARN_DAYS,
    check_password_in_history,
    get_password_age_days,
    is_password_expired,
    is_password_expiring_soon,
    validate_password_complexity,
)
from server.auth.jwt import get_password_hash


class TestPasswordComplexity:
    def test_valid_password(self):
        errors = validate_password_complexity("abcdef")
        assert errors == []

    def test_too_short(self):
        errors = validate_password_complexity("abcde")
        assert any("at least" in e for e in errors)

    def test_exactly_min_length(self):
        errors = validate_password_complexity("abcdef")
        assert errors == []

    def test_simple_password_is_valid(self):
        errors = validate_password_complexity("password")
        assert errors == []

    def test_numeric_password_is_valid(self):
        errors = validate_password_complexity("123456")
        assert errors == []


class TestPasswordHistory:
    def test_password_not_in_history(self):
        hashes = [get_password_hash("oldpass1"), get_password_hash("oldpass2")]
        assert check_password_in_history("newpass1", hashes) is False

    def test_password_in_history(self):
        hashes = [get_password_hash("oldpass1"), get_password_hash("oldpass2")]
        assert check_password_in_history("oldpass1", hashes) is True

    def test_empty_history(self):
        assert check_password_in_history("anypass", []) is False


class TestPasswordAge:
    def test_none_returns_none(self):
        assert get_password_age_days(None) is None

    def test_recent_password(self):
        from datetime import datetime, timezone, timedelta
        recent = datetime.now(timezone.utc) - timedelta(days=5)
        assert get_password_age_days(recent) == 5

    def test_old_password(self):
        from datetime import datetime, timezone, timedelta
        old = datetime.now(timezone.utc) - timedelta(days=100)
        assert get_password_age_days(old) == 100

    def test_naive_datetime_treated_as_utc(self):
        from datetime import datetime, timedelta
        naive = datetime.utcnow() - timedelta(days=10)
        assert get_password_age_days(naive) == 10


class TestPasswordExpiry:
    def test_not_expired(self):
        from datetime import datetime, timezone, timedelta
        recent = datetime.now(timezone.utc) - timedelta(days=30)
        assert is_password_expired(recent) is False

    def test_expired(self):
        from datetime import datetime, timezone, timedelta
        old = datetime.now(timezone.utc) - timedelta(days=PASSWORD_EXPIRE_DAYS + 10)
        assert is_password_expired(old) is True

    def test_none_not_expired(self):
        assert is_password_expired(None) is False

    def test_expiring_soon(self):
        from datetime import datetime, timezone, timedelta
        almost = datetime.now(timezone.utc) - timedelta(days=PASSWORD_EXPIRE_DAYS - 3)
        assert is_password_expiring_soon(almost) is True

    def test_not_expiring_soon(self):
        from datetime import datetime, timezone, timedelta
        recent = datetime.now(timezone.utc) - timedelta(days=10)
        assert is_password_expiring_soon(recent) is False
