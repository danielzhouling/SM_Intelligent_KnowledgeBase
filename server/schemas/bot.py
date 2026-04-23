from pydantic import BaseModel


class BotCreate(BaseModel):
    name: str
    key: str
    description: str | None = None
    icon: str | None = None
    welcome_message: str | None = None


class BotUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    icon: str | None = None
    welcome_message: str | None = None


class BotDifyConfig(BaseModel):
    dify_api_key: str


class BotResponse(BaseModel):
    id: str
    name: str
    key: str
    description: str | None
    icon: str | None
    welcome_message: str | None
    status: str
    created_at: str

    model_config = {"from_attributes": True}
