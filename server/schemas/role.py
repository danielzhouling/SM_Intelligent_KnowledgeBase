from pydantic import BaseModel


class RoleCreate(BaseModel):
    name: str
    description: str | None = None
    permission_keys: list[str] = []


class RoleUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    permission_keys: list[str] | None = None


class RoleResponse(BaseModel):
    id: str
    name: str
    description: str | None
    permissions: list["PermissionInfo"]
    user_count: int = 0
    created_at: str

    model_config = {"from_attributes": True}


class PermissionInfo(BaseModel):
    id: str
    key: str
    name: str
    type: str

    model_config = {"from_attributes": True}
