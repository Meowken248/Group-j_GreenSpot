"""
FastAPI Router for Posts Domain (Chức năng STT 9: Đăng bài kèm toạ độ, ảnh, video, gắn thẻ bạn bè hoặc đăng vào nhóm)
"""

import uuid
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query, UploadFile, File, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.rbac import User
from app.api.v1.rbac import get_current_active_user
from app.services.post_service import PostService
from app.schemas.post import (
    CreatePostRequest,
    UpdatePostRequest,
    ToggleHidePostRequest,
    ToggleHidePostResponse,
    PostDetailResponse,
    MediaUploadResponse,
)

router = APIRouter(prefix="/posts", tags=["Bài đăng cộng đồng (Posts)"])
post_service = PostService()


@router.post(
    "",
    response_model=PostDetailResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Đăng bài viết mới (Màn 1 -> Màn 4)",
)
async def create_new_post(
    payload: CreatePostRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Tạo bài viết cộng đồng:
    - Bắt buộc đăng nhập
    - Kiểm tra: Có chữ hoặc tối thiểu 1 ảnh/video
    - Giới hạn 3000 ký tự
    - Đính kèm tối đa 5 ảnh hoặc 1 video MP4
    - Lưu toạ độ GPS, địa chỉ, gắn thẻ tối đa 10 bạn bè
    - Trả về mã bài viết và kích hoạt Màn 4
    """
    post = await post_service.create_post(
        db=db,
        author_id=current_user.user_id,
        request=payload,
    )
    return post_service.format_post_response(post)


@router.post(
    "/media",
    response_model=MediaUploadResponse,
    summary="Tải lên tệp ảnh hoặc video (Màn 1)",
)
async def upload_post_media(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
):
    """
    Tải lên tệp đa phương tiện:
    - Ảnh: JPG, PNG, WEBP (tối đa 10MB)
    - Video: MP4, MOV (tối đa 50MB, thời lượng khuyến nghị < 60s)
    """
    return await post_service.save_uploaded_media(file)


@router.get(
    "/{post_id}",
    response_model=PostDetailResponse,
    summary="Xem chi tiết bài viết (Màn 4 -> Xem bài viết)",
)
async def get_post_detail(
    post_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Xem chi tiết bài viết theo post_id"""
    post = await post_service.get_post_by_id(db=db, post_id=post_id)
    return post_service.format_post_response(post)


@router.patch(
    "/{post_id}",
    response_model=PostDetailResponse,
    summary="Cập nhật bài viết với Optimistic Locking",
)
async def update_post(
    post_id: uuid.UUID,
    payload: UpdatePostRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Cập nhật bài viết có kiểm soát version OCC (Rule 7)"""
    post = await post_service.update_post(
        db=db,
        post_id=post_id,
        user_id=current_user.user_id,
        request=payload,
    )
    return post_service.format_post_response(post)


@router.patch(
    "/{post_id}/visibility",
    response_model=ToggleHidePostResponse,
    summary="Ẩn hoặc hiện lại bài viết (Feature STT 13 Màn 5/5)",
)
async def toggle_post_visibility(
    post_id: uuid.UUID,
    payload: ToggleHidePostRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Ẩn hoặc hiện lại bài viết của chính mình:
    - Bắt buộc đăng nhập
    - Chỉ chính tác giả mới có quyền ẩn/hiện bài viết
    """
    post = await post_service.toggle_hide_post(
        db=db,
        post_id=post_id,
        user_id=current_user.user_id,
        is_hidden=payload.is_hidden,
    )
    msg = "Ẩn bài viết thành công. Chỉ bạn nhìn thấy bài này." if payload.is_hidden else "Đã hiển thị lại bài viết"
    return ToggleHidePostResponse(
        success=True,
        post_id=post.post_id,
        is_hidden=post.is_hidden,
        message=msg,
    )


@router.delete(
    "/{post_id}",
    summary="Xóa mềm bài viết (Soft delete, Feature STT 13 Màn 3/5 & 4/5)",
)
async def delete_post(
    post_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Xóa bài viết theo chuẩn Soft delete (Rule 6)"""
    success = await post_service.soft_delete_post(
        db=db,
        post_id=post_id,
        user_id=current_user.user_id,
    )
    return {"success": success, "message": "Đã xoá bài viết"}


@router.get(
    "/groups/joined",
    summary="Danh sách nhóm tình nguyện đã tham gia (Màn 3)",
)
async def get_joined_volunteer_groups(
    current_user: User = Depends(get_current_active_user),
):
    """
    Cung cấp danh sách các nhóm tình nguyện mà người dùng đã tham gia để chọn đăng bài tại Màn 3.
    (Hỗ trợ phụ thuộc mềm với STT 16).
    """
    sample_groups = [
        {
            "group_id": "88888888-0001-0000-0000-000000000001",
            "name": "CLB Tình nguyện Sài Gòn Xanh",
            "description": "Nhóm xung kích dọn dẹp điểm nóng rác kênh rạch nội đô",
            "members_count": 1280,
            "district": "Quận 1",
            "requires_approval": False,
        },
        {
            "group_id": "88888888-0002-0000-0000-000000000002",
            "name": "Cộng đồng Tái chế Nhựa & Sống xanh Thủ Đức",
            "description": "Chia sẻ kinh nghiệm phân loại rác và đổi rác lấy quà",
            "members_count": 850,
            "district": "TP. Thủ Đức",
            "requires_approval": True,
        },
        {
            "group_id": "88888888-0003-0000-0000-000000000003",
            "name": "Chiến binh Xanh Kênh Nhiêu Lộc - Thị Nghè",
            "description": "Bảo vệ dòng kênh xanh và tuyên truyền không xả rác",
            "members_count": 640,
            "district": "Quận Bình Thạnh",
            "requires_approval": False,
        },
    ]
    return sample_groups
