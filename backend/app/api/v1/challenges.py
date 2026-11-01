"""
GreenSpot API Router - Weekly Green Challenges (Chức năng 25)
Thử thách xanh trong tuần (nhiệm vụ nhỏ) nhận điểm thưởng:
- Màn 1: Danh sách thử thách tuần, tiến độ tuần (2/5), đếm ngược thời gian.
- Màn 2: Hướng dẫn chi tiết và nộp minh chứng (ảnh + ghi chú).
- Màn 3: Popup hoàn thành thử thách, cộng điểm ngay (+30 điểm xanh).
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.rbac import User
from app.api.v1.rbac import get_current_active_user
from app.api.v1.rewards import get_optional_current_user
from app.services.challenge_service import ChallengeService
from app.schemas.challenge import (
    WeeklyChallengesResponse,
    ChallengeSubmitRequest,
    ChallengeCompletionResponse,
)

router = APIRouter(prefix="/challenges", tags=["Thử thách xanh trong tuần (Chức năng 25)"])

@router.get("/weekly", response_model=WeeklyChallengesResponse)
async def get_weekly_challenges(
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    [Chức năng 25 - Màn 1] Danh sách thử thách xanh trong tuần:
    - Công dân xem danh sách nhiệm vụ nhỏ, thanh tiến độ tuần và đồng hồ đếm ngược.
    - Nếu đã đăng nhập: đồng bộ trạng thái thực hiện của cá nhân.
    - Nếu chưa đăng nhập: xem công khai với thông báo nhắc đăng nhập.
    """
    user_id = current_user.user_id if current_user else None
    return await ChallengeService.get_weekly_challenges(db=db, current_user_id=user_id)


@router.post("/{challenge_id}/submit", response_model=ChallengeCompletionResponse)
async def submit_challenge_evidence(
    challenge_id: str,
    payload: ChallengeSubmitRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    [Chức năng 25 - Màn 2 & Màn 3] Gửi minh chứng hoàn thành thử thách:
    - Yêu cầu đăng nhập.
    - Tải ảnh minh chứng rõ nét và ghi chú (tối đa 200 ký tự).
    - Tự động cộng +30 Điểm Xanh (hoặc duyệt thủ công).
    - Khi hoàn thành đủ 5/5 nhiệm vụ, tặng thêm Combo +100 Điểm Xanh!
    """
    if not payload.evidence_image_url or not payload.evidence_image_url.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vui lòng tải lên ảnh minh chứng hoàn thành nhiệm vụ"
        )
    return await ChallengeService.submit_challenge(
        db=db,
        challenge_id=challenge_id,
        user_id=current_user.user_id,
        payload=payload
    )
