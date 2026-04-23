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
