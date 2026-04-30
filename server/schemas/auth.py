from pydantic import BaseModel


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class RefreshRequest(BaseModel):
    refresh_token: str


class RoleInfo(BaseModel):
    id: str
    name: str

    model_config = {"from_attributes": True}


class UserMeResponse(BaseModel):
    id: str
    username: str
    display_name: str
    roles: list[RoleInfo]
    permissions: list[str]


class ProfileResponse(BaseModel):
    id: str
    username: str
    display_name: str
    email: str
    phone: str
    roles: list[RoleInfo]
    password_age_days: int | None


class ProfileUpdateRequest(BaseModel):
    display_name: str
    email: str = ""
    phone: str = ""


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str
