import uuid
from datetime import datetime
from typing import List, Optional
from geoalchemy2 import Geometry
from sqlalchemy import ARRAY, BigInteger, Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import TimestampMixin


class EnvironmentalCampaign(Base, TimestampMixin):
    __tablename__ = "environmental_campaigns"

    campaign_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    organizer_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.user_id", ondelete="SET NULL"))
    unit_id: Mapped[Optional[int]] = mapped_column(ForeignKey("administrative_units.unit_id"))
    target_location = mapped_column(Geometry(geometry_type="POINT", srid=4326), nullable=True)
    location_address: Mapped[str] = mapped_column(String(255), nullable=False)
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    max_volunteers: Mapped[int] = mapped_column(Integer, default=50)
    current_volunteers_count: Mapped[int] = mapped_column(Integer, default=0)
    reward_points_awarded: Mapped[int] = mapped_column(Integer, default=100)
    banner_image_url: Mapped[Optional[str]] = mapped_column(String(500))
    status: Mapped[str] = mapped_column(String(30), default="UPCOMING")


class CampaignParticipant(Base):
    __tablename__ = "campaign_participants"

    participant_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    campaign_id: Mapped[int] = mapped_column(ForeignKey("environmental_campaigns.campaign_id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    registered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    is_checked_in: Mapped[bool] = mapped_column(Boolean, default=False)
    checked_in_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    points_credited: Mapped[int] = mapped_column(Integer, default=0)
    certificate_issued: Mapped[bool] = mapped_column(Boolean, default=False)
    certificate_url: Mapped[Optional[str]] = mapped_column(String(500))


class CitizenReward(Base):
    __tablename__ = "citizen_rewards"

    reward_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    reward_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    points_required: Mapped[int] = mapped_column(Integer, nullable=False)
    reward_type: Mapped[str] = mapped_column(String(30), default="VOUCHER")
    stock_quantity: Mapped[int] = mapped_column(Integer, default=100)
    image_url: Mapped[Optional[str]] = mapped_column(String(500))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class RewardTransaction(Base):
    __tablename__ = "reward_transactions"

    transaction_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    reward_id: Mapped[Optional[int]] = mapped_column(ForeignKey("citizen_rewards.reward_id", ondelete="SET NULL"))
    incident_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("incidents.incident_id", ondelete="SET NULL"))
    transaction_type: Mapped[str] = mapped_column(String(20), nullable=False)
    points_amount: Mapped[int] = mapped_column(Integer, nullable=False)
    balance_after: Mapped[int] = mapped_column(Integer, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ChatbotConversation(Base, TimestampMixin):
    __tablename__ = "chatbot_conversations"

    conversation_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.user_id", ondelete="SET NULL"))
    session_token: Mapped[str] = mapped_column(String(255), nullable=False)
    channel: Mapped[str] = mapped_column(String(30), default="WEB_PORTAL")
    is_resolved: Mapped[bool] = mapped_column(Boolean, default=False)
    satisfaction_rating: Mapped[Optional[int]] = mapped_column(Integer)


class ChatbotMessage(Base):
    __tablename__ = "chatbot_messages"

    message_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    conversation_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("chatbot_conversations.conversation_id", ondelete="CASCADE"), nullable=False)
    sender_type: Mapped[str] = mapped_column(String(20), nullable=False)
    message_text: Mapped[str] = mapped_column(Text, nullable=False)
    detected_intent: Mapped[Optional[str]] = mapped_column(String(100))
    extracted_entities: Mapped[Optional[dict]] = mapped_column(JSONB)
    confidence_score: Mapped[Optional[float]] = mapped_column(Numeric(5, 4))
    suggested_quick_replies: Mapped[Optional[List[str]]] = mapped_column(ARRAY(Text))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
