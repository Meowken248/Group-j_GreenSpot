import enum
import uuid
from datetime import datetime
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.rbac import User


class GroupType(str, enum.Enum):
    DISTRICT = "DISTRICT"    # Theo quận
    WARD = "WARD"            # Theo phường
    THEME = "THEME"          # Theo chủ đề


class GroupPrivacy(str, enum.Enum):
    PUBLIC = "PUBLIC"        # Công khai
    PRIVATE = "PRIVATE"      # Riêng tư


class GroupMemberRole(str, enum.Enum):
    ADMIN = "ADMIN"          # Quản trị nhóm
    MODERATOR = "MODERATOR"  # Kiểm duyệt viên
    MEMBER = "MEMBER"        # Thành viên


class GroupMemberStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    PENDING = "PENDING"
    BANNED = "BANNED"


class GroupStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    DISBANDED = "DISBANDED"  # Đã giải tán


class Group(Base, TimestampMixin):
    """
    Bảng Nhóm Cộng Đồng Môi Trường (Chức năng 16: Tạo nhóm theo quận, theo phường hoặc theo chủ đề):
    - name: Tên nhóm (tối đa 50 ký tự)
    - description: Mô tả nhóm (tối đa 300 ký tự)
    - cover_image_url: Ảnh bìa (tối đa 5MB, JPG/PNG)
    - group_type: DISTRICT, WARD, THEME
    - district, ward, theme_topic: Phạm vi hoạt động
    - privacy: PUBLIC, PRIVATE
    - creator_id: Quản trị nhóm sáng lập
    - members_count: Tổng số thành viên
    - posts_count: Tổng số bài viết
    - version: Optimistic locking (Rule 7)
    - deleted_at: Soft delete (Rule 6)
    """
    __tablename__ = "groups"

    group_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    cover_image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    group_type: Mapped[str] = mapped_column(
        String(20), default=GroupType.DISTRICT.value, nullable=False, index=True
    )
    province: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    district: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    ward: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    theme_topic: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)

    privacy: Mapped[str] = mapped_column(
        String(20), default=GroupPrivacy.PUBLIC.value, nullable=False
    )
    creator_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True
    )

    members_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    posts_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), default=GroupStatus.ACTIVE.value, nullable=False, index=True
    )

    # Optimistic locking & Soft delete
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True
    )

    # Relationships
    creator: Mapped["User"] = relationship("User", foreign_keys=[creator_id])
    members: Mapped[List["GroupMember"]] = relationship(
        "GroupMember", back_populates="group", cascade="all, delete-orphan"
    )
    invitations: Mapped[List["GroupInvitation"]] = relationship(
        "GroupInvitation", back_populates="group", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("idx_groups_active_type", "status", "group_type", "deleted_at"),
        Index("idx_groups_geo_scope", "province", "district", "ward"),
    )


class GroupMember(Base):
    """
    Thành viên nhóm cộng đồng:
    - role: ADMIN (Quản trị nhóm), MODERATOR (Kiểm duyệt viên), MEMBER (Thành viên)
    - status: ACTIVE, PENDING, BANNED
    - joined_at: Thời điểm tham gia
    """
    __tablename__ = "group_members"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    group_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("groups.group_id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True
    )
    role: Mapped[str] = mapped_column(
        String(20), default=GroupMemberRole.MEMBER.value, nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(20), default=GroupMemberStatus.ACTIVE.value, nullable=False
    )
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    deleted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    group: Mapped["Group"] = relationship("Group", back_populates="members")
    user: Mapped["User"] = relationship("User")

    __table_args__ = (
        UniqueConstraint("group_id", "user_id", name="uq_group_user_member"),
    )


class GroupInvitation(Base):
    """
    Lời mời bạn bè vào nhóm (Màn 3 sau khi tạo nhóm thành công):
    - status: PENDING, ACCEPTED, DECLINED
    """
    __tablename__ = "group_invitations"

    invitation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    group_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("groups.group_id", ondelete="CASCADE"), nullable=False, index=True
    )
    inviter_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True
    )
    invitee_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True
    )
    status: Mapped[str] = mapped_column(String(20), default="PENDING", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    group: Mapped["Group"] = relationship("Group", back_populates="invitations")
    inviter: Mapped["User"] = relationship("User", foreign_keys=[inviter_id])
    invitee: Mapped["User"] = relationship("User", foreign_keys=[invitee_id])
