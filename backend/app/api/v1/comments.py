"""
FastAPI Router cho Chức năng 14: Bình luận, Trả lời bình luận 1 cấp và Chia sẻ bài viết
"""

import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.rbac import User
from app.api.v1.rbac import get_current_active_user
from app.services.comment_service import CommentService
from app.schemas.comment import (
    CreateCommentRequest,
    CreateReplyRequest,
    CommentItemResponse,
    ReplyItemResponse,
    CommentListResponse,
    ReplyListResponse,
    SharePostRequest,
    SharePostResponse,
)

router = APIRouter(tags=["Bình luận & Chia sẻ bài viết (Feature STT 14)"])
comment_service = CommentService()


# =============================================================================
# 1. BÌNH LUẬN CẤP 1 (MÀN 1)
# =============================================================================

@router.get(
    "/posts/{post_id}/comments",
    response_model=CommentListResponse,
    summary="Lấy danh sách bình luận cấp 1 của bài viết (Màn 1)",
)
async def get_post_comments_endpoint(
    post_id: uuid.UUID,
    page: int = Query(1, ge=1, description="Số trang (10 bình luận/lần tải)"),
    limit: int = Query(10, ge=1, le=50, description="Số lượng bình luận mỗi lần tải"),
    sort: str = Query("relevant", description="Sắp xếp: relevant (phù hợp nhất), newest (mới nhất), all (tất cả bình luận)"),
    db: AsyncSession = Depends(get_db),
):
    """
    Truy vấn bình luận cấp 1:
    - Không bắt buộc đăng nhập (Khách vãng lai đọc được)
    - Sắp xếp theo sort: relevant (Phù hợp nhất), newest (Mới nhất), all (Tất cả bình luận)
    - Kèm theo tối đa 3 câu trả lời ban đầu (cũ nhất ở trên ASC)
    - Phân trang 10 bình luận mỗi lần
    """
    return await comment_service.get_post_comments(
        db=db,
        post_id=post_id,
        page=page,
        limit=limit,
        sort=sort,
    )


@router.post(
    "/posts/{post_id}/comments",
    response_model=CommentItemResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Tạo bình luận cấp 1 (Màn 1)",
)
async def create_post_comment_endpoint(
    post_id: uuid.UUID,
    payload: CreateCommentRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Đăng bình luận cấp 1:
    - Bắt buộc đăng nhập
    - Tối đa 500 ký tự
    - Kiểm tra chống spam tần suất (Rate limit 3s)
    - Tăng comments_count của bài viết
    """
    return await comment_service.create_comment(
        db=db,
        user_id=current_user.user_id,
        post_id=post_id,
        payload=payload,
    )


# =============================================================================
# 2. CÂU TRẢ LỜI BÌNH LUẬN (MÀN 2 - 1 CẤP DUY NHẤT)
# =============================================================================

@router.get(
    "/comments/{comment_id}/replies",
    response_model=ReplyListResponse,
    summary="Lấy toàn bộ câu trả lời của một bình luận gốc (Màn 2)",
)
async def get_comment_replies_endpoint(
    comment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """
    Truy vấn toàn bộ câu trả lời:
    - Sắp xếp cũ nhất ở trên (ASC) theo mạch hội thoại
    """
    return await comment_service.get_comment_replies(
        db=db,
        comment_id=comment_id,
    )


@router.post(
    "/comments/{comment_id}/replies",
    response_model=ReplyItemResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Trả lời một bình luận hoặc câu trả lời khác (Màn 2)",
)
async def create_comment_reply_endpoint(
    comment_id: uuid.UUID,
    payload: CreateReplyRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Gửi câu trả lời:
    - Bắt buộc đăng nhập
    - Tối đa 500 ký tự
    - Chống spam tần suất
    - Ép buộc quy tắc 1 cấp duy nhất: Nếu trả lời một câu trả lời con,
      hệ thống vẫn gắn vào parent_id của bình luận gốc và tag author của reply con đó!
    """
    return await comment_service.create_reply(
        db=db,
        user_id=current_user.user_id,
        comment_id=comment_id,
        payload=payload,
    )


@router.delete(
    "/comments/{comment_id}",
    summary="Xóa mềm bình luận của chính mình",
)
async def delete_comment_endpoint(
    comment_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Xóa bình luận theo chuẩn Soft delete (Rule 6)"""
    is_admin = getattr(current_user, "role", None) and getattr(current_user.role, "role_code", "") == "ADMIN"
    success = await comment_service.soft_delete_comment(
        db=db,
        user_id=current_user.user_id,
        comment_id=comment_id,
        is_admin=bool(is_admin),
    )
    return {"success": success, "message": "Đã xóa bình luận"}


# =============================================================================
# 3. CHIA SẺ BÀI VIẾT (MÀN 3)
# =============================================================================

@router.post(
    "/posts/{post_id}/share",
    response_model=SharePostResponse,
    summary="Chia sẻ bài viết (Màn 3: Bảng tin, Bạn bè, Nhóm, Sao chép liên kết)",
)
async def share_post_endpoint(
    post_id: uuid.UUID,
    payload: SharePostRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Chia sẻ bài viết:
    - Bắt buộc đăng nhập
    - Kiểm tra quyền riêng tư (chỉ PUBLIC mới được chia sẻ; PRIVATE/FRIENDS bị cấm 403)
    - Hỗ trợ: 'FEED', 'FRIENDS', 'GROUP', 'LINK'
    """
    return await comment_service.share_post(
        db=db,
        user_id=current_user.user_id,
        post_id=post_id,
        payload=payload,
    )

