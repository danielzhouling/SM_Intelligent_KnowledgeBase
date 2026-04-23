from pydantic import BaseModel


class FeedbackSubmit(BaseModel):
    bot_id: str
    conversation_id: str | None = None
    message_id: str
    query: str
    answer: str
    rating: str  # useful / not_useful
    reason: str | None = None
    comment: str | None = None


class FeedbackReview(BaseModel):
    result: str  # approved / rejected / source_error / duplicate
    review_comment: str | None = None


class FeedbackResponse(BaseModel):
    id: str
    bot_id: str
    bot_name: str | None = None
    conversation_id: str | None
    message_id: str
    query: str
    answer: str
    rating: str
    reason: str | None
    comment: str | None
    status: str
    review_result: str | None
    review_comment: str | None
    reviewer: str | None
    reviewed_at: str | None
    created_at: str

    model_config = {"from_attributes": True}


class FeedbackExportRequest(BaseModel):
    status: str | None = None  # approved / rejected / source_error / duplicate
    rating: str | None = None  # useful / not_useful
    date_from: str | None = None
    date_to: str | None = None
