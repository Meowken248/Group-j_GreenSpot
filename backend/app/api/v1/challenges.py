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
from uuid import UUID
from app.api.v1.rbac import require_admin_user
from app.schemas.challenge import (
    WeeklyChallengesResponse,
    ChallengeSubmitRequest,
    ChallengeCompletionResponse,
    ChallengeCreateRequest,
    ChallengeUpdateRequest,
    AdminChallengeItemResponse,
    AdminChallengeListResponse,
    AdminSubmissionListResponse,
    AdminReviewSubmissionRequest,
    AdminReviewSubmissionResponse,
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
    - Tự động cộng +30 Điểm Xanh (hoặc chờ cán bộ duyệt).
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


# ==========================================
# ADMIN ENDPOINTS: CRUD THỬ THÁCH
# ==========================================
@router.get("/admin/all", response_model=AdminChallengeListResponse)
async def admin_get_all_challenges(
    current_admin: User = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """
    [Admin] Lấy toàn bộ danh sách thử thách (kể cả đã ẩn) và thống kê số người nộp/hoàn thành.
    """
    return await ChallengeService.admin_get_all_challenges(db=db)


@router.post("/admin", status_code=status.HTTP_201_CREATED)
async def admin_create_challenge(
    payload: ChallengeCreateRequest,
    current_admin: User = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """
    [Admin] Thêm mới một thử thách xanh.
    """
    ch = await ChallengeService.admin_create_challenge(db=db, payload=payload, admin_id=current_admin.user_id)
    return {"message": "Đã tạo thử thách mới thành công", "challenge_id": ch.challenge_id}


@router.put("/admin/{challenge_id}")
async def admin_update_challenge(
    challenge_id: str,
    payload: ChallengeUpdateRequest,
    current_admin: User = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """
    [Admin] Cập nhật thông tin thử thách xanh.
    """
    ch = await ChallengeService.admin_update_challenge(db=db, challenge_id=challenge_id, payload=payload, admin_id=current_admin.user_id)
    return {"message": "Đã cập nhật thử thách thành công", "challenge_id": ch.challenge_id}


@router.delete("/admin/{challenge_id}")
async def admin_delete_challenge(
    challenge_id: str,
    current_admin: User = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """
    [Admin] Xóa bỏ thử thách xanh khỏi hệ thống.
    """
    await ChallengeService.admin_delete_challenge(db=db, challenge_id=challenge_id, admin_id=current_admin.user_id)
    return {"message": "Đã xóa thử thách thành công"}


@router.patch("/admin/{challenge_id}/toggle-active")
async def admin_toggle_challenge_active(
    challenge_id: str,
    current_admin: User = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """
    [Admin] Bật/tắt trạng thái kích hoạt của thử thách.
    """
    new_state = await ChallengeService.admin_toggle_challenge_active(db=db, challenge_id=challenge_id, admin_id=current_admin.user_id)
    return {"message": f"Đã {'kích hoạt' if new_state else 'tắt'} thử thách", "is_active": new_state}


# ==========================================
# ADMIN ENDPOINTS: DUYỆT MINH CHỨNG NỘP
# ==========================================
@router.get("/admin/submissions", response_model=AdminSubmissionListResponse)
async def admin_get_submissions(
    status: Optional[str] = None,
    week_year: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    current_admin: User = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """
    [Admin] Tra cứu danh sách minh chứng nộp của công dân để tiến hành xét duyệt điểm.
    """
    return await ChallengeService.admin_get_submissions(
        db=db,
        status_filter=status,
        week_year=week_year,
        search=search,
        limit=limit,
        offset=offset
    )


@router.post("/admin/submissions/{submission_id}/review", response_model=AdminReviewSubmissionResponse)
async def admin_review_submission(
    submission_id: UUID,
    payload: AdminReviewSubmissionRequest,
    current_admin: User = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """
    [Admin] Phê duyệt (+điểm xanh) hoặc Từ chối (kèm lý do) minh chứng nộp của công dân.
    """
    return await ChallengeService.admin_review_submission(
        db=db,
        submission_id=submission_id,
        payload=payload,
        admin_user=current_admin
    )
