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
    district_code: Optional[str] = None
    district_name: Optional[str] = None

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
    selected_district: Optional[str] = None

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

class CreateCommunityGroupRequest(BaseModel):
    group_id: Optional[str] = None
    name: str
    description: Optional[str] = None
    avatar_url: Optional[str] = None
    member_count: int = 1

class UpdateCommunityGroupRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    avatar_url: Optional[str] = None
    member_count: Optional[int] = None
    is_active: Optional[bool] = None

class CommunityGroupResponse(BaseModel):
    group_id: str
    name: str
    description: Optional[str] = None
    avatar_url: Optional[str] = None
    member_count: int
    total_points: int
    weekly_points: int
    monthly_points: int
    is_active: bool

    class Config:
        from_attributes = True

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

class LeaderboardSnapshotRewardItem(BaseModel):
    rank: int
    user_id: str
    full_name: str
    points_rewarded: int
    title: str

class LeaderboardSnapshotResponse(BaseModel):
    cycle: str
    snapshot_date: str
    winners: List[LeaderboardSnapshotRewardItem]
    message: str

