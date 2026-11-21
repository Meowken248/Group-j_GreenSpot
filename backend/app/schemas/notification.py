import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class NotificationItem(BaseModel):
    notification_id: uuid.UUID
    user_id: uuid.UUID
    title: str
    message: str
    notification_type: str
    reference_id: Optional[str] = None
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NotificationListResponse(BaseModel):
    items: List[NotificationItem]
    total: int
    unread_count: int
