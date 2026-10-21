"""
FastAPI Router cho Chức năng 16: Tạo nhóm theo quận, theo phường hoặc theo chủ đề (Community Groups)
Tuân thủ nghiêm ngặt đặc tả Báo cáo Đồ án Web 1 (pp. 137-141).
"""

import os
import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, UploadFile, File, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.rbac import User
from app.api.v1.rbac import get_current_active_user
from app.core.config import UPLOAD_DIR
from app.services.group_service import GroupService
from app.schemas.group import (
    GroupCreate,
    GroupResponse,
    GroupListResponse,
    GroupDisbandRequest,
    InviteFriendsRequest,
    AdministrativeMetadataResponse,
)

router = APIRouter(prefix="/groups", tags=["Community Groups (Chức năng 16)"])


@router.get(
    "/metadata",
    response_model=AdministrativeMetadataResponse,
    summary="Lấy danh mục đơn vị hành chính và chủ đề môi trường",
)
async def get_groups_metadata():
    """Phục vụ chọn quận, phường hoặc chủ đề ở Màn 1 & Màn 2."""
    return GroupService.get_metadata()


@router.get(
    "/my-groups",
    response_model=GroupListResponse,
    summary="Lấy danh sách nhóm của tôi (quản trị hoặc tham gia)",
)
async def get_my_groups(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Hiển thị danh sách nhóm mà user đã tham gia.
    Trả về cả admin_groups_count để kiểm tra giới hạn 5 nhóm ở Màn 1.
    """
    items, total, admin_count = await GroupService.get_my_groups(db, current_user.user_id)
    return GroupListResponse(
        items=items,
        total=total,
        admin_groups_count=admin_count,
        max_admin_groups=5,
    )


@router.get(
    "/explore",
    response_model=GroupListResponse,
    summary="Khám phá các nhóm cộng đồng theo bộ lọc",
)
async def explore_groups(
    group_type: Optional[str] = Query(None, description="DISTRICT, WARD, THEME"),
    province: Optional[str] = Query(None, description="Tên tỉnh/thành phố lọc"),
    district: Optional[str] = Query(None, description="Tên quận lọc"),
    ward: Optional[str] = Query(None, description="Tên phường lọc"),
    theme_topic: Optional[str] = Query(None, description="Chủ đề môi trường"),
    q: Optional[str] = Query(None, description="Tìm kiếm theo tên nhóm"),
    limit: int = Query(20, ge=1, le=50),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Khám phá nhóm cộng đồng công khai và kiểm tra quyền tham gia."""
    items, total = await GroupService.explore_groups(
        db=db,
        user_id=current_user.user_id,
        group_type=group_type,
        province=province,
        district=district,
        ward=ward,
        theme_topic=theme_topic,
        query=q,
        limit=limit,
        offset=offset,
    )
    admin_count = await GroupService.count_admin_groups(db, current_user.user_id)
    return GroupListResponse(
        items=items,
        total=total,
        admin_groups_count=admin_count,
        max_admin_groups=5,
    )


@router.post(
    "/upload-cover",
    summary="Tải lên ảnh bìa nhóm (Màn 2: JPG/PNG, tối đa 5MB)",
)
async def upload_group_cover(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
):
    """
    Kiểm tra định dạng và kích thước ảnh bìa theo đúng SRS:
    - Chỉ nhận JPG, PNG (hoặc JPEG, WEBP)
    - Tối đa 5MB (5 * 1024 * 1024 bytes)
    """
    allowed_types = ["image/jpeg", "image/png", "image/jpg", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ảnh không hợp lệ (chỉ nhận JPG, PNG, tối đa 5MB)",
        )

    # Đọc nội dung để kiểm tra kích thước
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ảnh không hợp lệ (chỉ nhận JPG, PNG, tối đa 5MB)",
        )

    group_upload_dir = os.path.join(UPLOAD_DIR, "groups")
    os.makedirs(group_upload_dir, exist_ok=True)

    file_ext = os.path.splitext(file.filename or "")[1] or ".jpg"
    new_filename = f"group_cover_{uuid.uuid4()}{file_ext}"
    target_path = os.path.join(group_upload_dir, new_filename)

    with open(target_path, "wb") as f:
        f.write(content)

    return {"url": f"/uploads/groups/{new_filename}"}


@router.post(
    "",
    response_model=GroupResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Tạo nhóm cộng đồng mới (Màn 2 -> Màn 3)",
)
async def create_group(
    payload: GroupCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Tạo nhóm mới theo quy chuẩn nghiệp vụ SRS:
    - Ràng buộc tối đa 5 nhóm làm Admin
    - Ràng buộc cập nhật địa chỉ quận/phường trong hồ sơ nếu chọn theo khu vực
    - Kiểm tra tính hợp lệ phạm vi
    - Kiểm tra trùng tên nhóm trong cùng phạm vi
    - Tự động gán người tạo làm ADMIN
    """
    group = await GroupService.create_group(db, current_user, payload)
    return GroupResponse(
        group_id=group.group_id,
        name=group.name,
        description=group.description,
        cover_image_url=group.cover_image_url,
        avatar_url=group.avatar_url,
        group_type=group.group_type,
        province=group.province,
        district=group.district,
        ward=group.ward,
        theme_topic=group.theme_topic,
        privacy=group.privacy,
        creator_id=group.creator_id,
        creator_name=current_user.full_name,
        members_count=group.members_count,
        posts_count=group.posts_count,
        status=group.status,
        version=group.version,
        created_at=group.created_at,
        is_member=True,
        my_role="ADMIN",
    )


@router.get(
    "/{group_id}",
    response_model=GroupResponse,
    summary="Chi tiết một nhóm cộng đồng",
)
async def get_group_detail(
    group_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Lấy thông tin chi tiết nhóm."""
    return await GroupService.get_group_detail(db, group_id, current_user.user_id)


@router.post(
    "/{group_id}/invite",
    summary="Mời bạn bè vào nhóm (Màn 3 sau khi tạo nhóm thành công)",
)
async def invite_friends_to_group(
    group_id: uuid.UUID,
    payload: InviteFriendsRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Gửi lời mời bạn bè vào nhóm."""
    return await GroupService.invite_friends(
        db, group_id, current_user.user_id, payload.friend_ids
    )


@router.post(
    "/{group_id}/join",
    summary="Tham gia nhóm",
)
async def join_group(
    group_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Người dùng tham gia nhóm."""
    return await GroupService.join_group(db, group_id, current_user.user_id)


@router.post(
    "/{group_id}/leave",
    summary="Rời khỏi nhóm",
)
async def leave_group(
    group_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Rời khỏi nhóm (chặn nếu là Quản trị nhóm duy nhất)."""
    return await GroupService.leave_group(db, group_id, current_user.user_id)


@router.post(
    "/{group_id}/disband",
    summary="Giải tán nhóm (Chỉ dành cho Quản trị nhóm)",
)
async def disband_group(
    group_id: uuid.UUID,
    payload: GroupDisbandRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Giải tán nhóm theo SRS pp. 140-141:
    - Bắt buộc phải là ADMIN
    - Yêu cầu gõ chính xác 100% tên nhóm để xác nhận
    """
    return await GroupService.disband_group(
        db, group_id, current_user.user_id, payload.confirmation_name
    )
