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
    status: str = Field(default="NOT_STARTED", description="NOT_STARTED | PENDING | COMPLETED | REJECTED")
    evidence_image_url: Optional[str] = None
    evidence_note: Optional[str] = None
    rejection_reason: Optional[str] = None
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

class ChallengeCreateRequest(BaseModel):
    challenge_id: Optional[str] = None
    title: str = Field(..., min_length=3, max_length=255)
    description: str = Field(..., min_length=5)
    points_reward: int = Field(default=30, ge=5, le=500)
    category: str = Field(default="DAILY_HABIT")
    icon: str = Field(default="leaf")
    requirements: str = Field(..., min_length=5)
    is_auto_verify: bool = Field(default=True)
    is_active: bool = Field(default=True)
    order_index: int = Field(default=1, ge=0)

class ChallengeUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    points_reward: Optional[int] = Field(None, ge=5, le=500)
    category: Optional[str] = None
    icon: Optional[str] = None
    requirements: Optional[str] = None
    is_auto_verify: Optional[bool] = None
    is_active: Optional[bool] = None
    order_index: Optional[int] = None

class AdminChallengeItemResponse(BaseModel):
    challenge_id: str
    title: str
    description: str
    points_reward: int
    category: str
    icon: str
    requirements: str
    is_auto_verify: bool
    is_active: bool
    order_index: int
    created_at: datetime
    participants_count: int = 0
    completed_count: int = 0

class AdminChallengeListResponse(BaseModel):
    total: int
    challenges: List[AdminChallengeItemResponse]

class AdminSubmissionItemResponse(BaseModel):
    id: str
    user_id: str
    user_name: str
    user_email: str
    challenge_id: str
    challenge_title: str
    points_reward: int
    week_year: str
    status: str
    evidence_image_url: Optional[str] = None
    evidence_note: Optional[str] = None
    rejection_reason: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

class AdminSubmissionListResponse(BaseModel):
    total: int
    pending_count: int
    submissions: List[AdminSubmissionItemResponse]

class AdminReviewSubmissionRequest(BaseModel):
    action: str = Field(..., description="APPROVE | REJECT")
    rejection_reason: Optional[str] = Field(None, description="Lý do từ chối nếu action là REJECT")

class AdminReviewSubmissionResponse(BaseModel):
    submission_id: str
    action: str
    new_status: str
    points_awarded: int = 0
    message: str

