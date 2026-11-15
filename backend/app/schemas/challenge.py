from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

class ChallengeItemResponse(BaseModel):
    challenge_id: str
    title: str
    description: str
    points_reward: int
    category: str
    icon: str
    requirements: str
    is_auto_verify: bool
    status: str = Field(default="NOT_STARTED", description="NOT_STARTED | PENDING | COMPLETED")
    evidence_image_url: Optional[str] = None
    evidence_note: Optional[str] = None
    completed_at: Optional[datetime] = None

class WeeklyChallengesResponse(BaseModel):
    week_year: str
    days_left: int
    hours_left: int
    time_left_str: str  # VD: "Còn 3 ngày 14 giờ"
    completed_count: int
    total_count: int
    progress_percentage: int
    combo_reward_points: int = 100
    is_all_completed: bool = False
    challenges: List[ChallengeItemResponse]

class ChallengeSubmitRequest(BaseModel):
    evidence_image_url: str = Field(..., min_length=5, description="Ảnh minh chứng rõ nét")
    evidence_note: Optional[str] = Field(None, max_length=200, description="Ghi chú ngắn tối đa 200 ký tự")

class ChallengeCompletionResponse(BaseModel):
    challenge_id: str
    title: str
    points_awarded: int
    combo_awarded: int = 0
    new_balance: int
    status: str
    message: str
