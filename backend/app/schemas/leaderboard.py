import uuid
from typing import Optional, List
from pydantic import BaseModel

class IndividualLeaderboardItem(BaseModel):
    rank: int
    user_id: uuid.UUID
    full_name: str
    avatar_url: Optional[str] = None
    green_points: int
    tier_name: str
    tier_code: str
    badge_icon: str

class MyRankResponse(BaseModel):
    is_logged_in: bool = True
    rank: int
    total_citizens: int
    green_points: int
    points_to_top_100: int
    is_top_10: bool = False
    tier_name: str
    message: Optional[str] = None

class IndividualLeaderboardResponse(BaseModel):
    top_10: List[IndividualLeaderboardItem]
    my_rank: Optional[MyRankResponse] = None

class GroupLeaderboardItem(BaseModel):
    rank: int
    group_id: str
    name: str
    avatar_url: Optional[str] = None
    description: Optional[str] = None
    member_count: int
    points: int
    is_user_group: bool = False

class GroupLeaderboardResponse(BaseModel):
    cycle: str # WEEK | MONTH | ALL
    groups: List[GroupLeaderboardItem]

class DistrictLeaderboardItem(BaseModel):
    rank: int
    district_code: str
    district_name: str
    green_index: float
    cleanup_rate: float
    resolved_incidents: int
    is_user_district: bool = False

class DistrictLeaderboardResponse(BaseModel):
    cycle: str # WEEK | MONTH | ALL
    districts: List[DistrictLeaderboardItem]
