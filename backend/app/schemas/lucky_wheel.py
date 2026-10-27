import uuid
from typing import Optional, List
from pydantic import BaseModel

class WheelSlotItem(BaseModel):
    slot_index: int
    reward_type: str # POINTS | BADGE | VOUCHER | LUCK
    reward_name: str
    points_won: int
    badge_won: Optional[str] = None
    voucher_code: Optional[str] = None
    icon: str
    color: str

class WheelStatusResponse(BaseModel):
    spins_left_today: int
    has_spins_today: bool
    next_reset_seconds: int
    next_reset_time: str
    total_points_won: int
    total_badges_won: int
    slots: List[WheelSlotItem]

class SpinResultResponse(BaseModel):
    success: bool
    slot_index: int
    reward_type: str
    reward_name: str
    points_won: int
    badge_won: Optional[str] = None
    voucher_code: Optional[str] = None
    message: str
    new_total_points: int
    spins_left_today: int

class SpinHistoryItem(BaseModel):
    spin_id: uuid.UUID
    spin_date: str
    formatted_time: str
    reward_type: str
    reward_name: str
    points_won: int
    badge_won: Optional[str] = None

class SpinHistoryResponse(BaseModel):
    total_spins: int
    total_points_won: int
    total_badges_won: int
    history: List[SpinHistoryItem]
    empty_message: Optional[str] = None
