from pydantic import BaseModel


class ChatMessageRequest(BaseModel):
    bot_id: str
    query: str
    conversation_id: str | None = None


class ChatMessageResponse(BaseModel):
    answer: str
    conversation_id: str
    message_id: str
    citations: list | None = None


class ConversationResponse(BaseModel):
    id: str
    bot_id: str
    title: str | None
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}


class MessageResponse(BaseModel):
    id: str
    role: str  # user / assistant
    content: str
    created_at: str

    model_config = {"from_attributes": True}
