from pydantic import BaseModel


class UserCreate(BaseModel):
    username: str
    password: str
    display_name: str
    role_ids: list[str] = []
    status: str = "active"


class UserUpdate(BaseModel):
    display_name: str | None = None
    role_ids: list[str] | None = None
    status: str | None = None


class UserResponse(BaseModel):
    id: str
    username: str
    display_name: str
    status: str
    roles: list["RoleInfo"]
    created_at: str

    model_config = {"from_attributes": True}


from server.schemas.auth import RoleInfo  # noqa: E402
UserResponse.model_rebuild()
