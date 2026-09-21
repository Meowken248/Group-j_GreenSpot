"""
Domain Model: Quản lý Thủy triều, Điểm ngập lụt Đô thị & Điều hướng Tuyến đường An toàn
Thiết kế theo chuẩn Domain-Driven Design (DDD), SQLAlchemy 2.0 Type-Safe Mapped, và PostGIS Spatial Extension.
"""

from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import List, Optional

from geoalchemy2 import Geometry
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin


# ==========================================
# ENUMS: Định nghĩa các trạng thái nghiệp vụ
# ==========================================

class TideState(str, enum.Enum):
    """Trạng thái chu kỳ con nước"""
    RISING = "RISING"          # Nước đang lên (Triều dâng)
    FALLING = "FALLING"        # Nước đang rút (Triều rút)
    HIGH_TIDE = "HIGH_TIDE"    # Đạt đỉnh triều (Đỉnh triều)
    LOW_TIDE = "LOW_TIDE"      # Đạt chân triều (Chân triều)
    STAND = "STAND"            # Nước đứng (Giao thời)


class TideAlertLevel(str, enum.Enum):
    """Cấp độ cảnh báo triều cường TP.HCM theo quy chuẩn thủy văn"""
    NORMAL = "NORMAL"          # < 1.40m: Mức an toàn
    ALERT_1 = "ALERT_1"        # 1.40m - 1.50m: Báo động I (Nước mấp mé bờ kè)
    ALERT_2 = "ALERT_2"        # 1.50m - 1.60m: Báo động II (Ngập các vùng trũng thấp ven sông)
    ALERT_3 = "ALERT_3"        # > 1.60m: Báo động III (Ngập sâu diện rộng đô thị)


class FloodCauseType(str, enum.Enum):
    """Nguyên nhân gây ngập tuyến đường"""
    TIDAL = "TIDAL"            # Do triều cường dâng từ sông/kênh rạch
    RAINFALL = "RAINFALL"      # Do mưa to vượt công suất tiêu thoát nước
    COMBINED = "COMBINED"      # Mưa lớn kết hợp triều cường đạt đỉnh (Nguy hiểm nhất)
    INFRASTRUCTURE = "INFRA"   # Nghẹt cống, đang thi công, nắp cống hỏng


class FloodSeverityLevel(str, enum.Enum):
    """Mức độ nghiêm trọng của điểm ngập lụt"""
    SAFE = "SAFE"              # Khô ráo, lưu thông bình thường
    MINOR = "MINOR"            # Ngập nhẹ 5 - 15cm (Mép bánh xe, xe máy lưu thông chậm)
    MODERATE = "MODERATE"      # Ngập vừa 15 - 30cm (Ngập ống xả, xe gầm thấp nguy cơ chết máy)
    SEVERE = "SEVERE"          # Ngập nặng 30 - 50cm (Chỉ xe tải/SUV gầm cao qua được)
    IMPASSABLE = "IMPASSABLE"  # Ngập cực sâu > 50cm (Cấm đường hoàn toàn)


class RouteSafetyStatus(str, enum.Enum):
    """Đánh giá mức độ an toàn của lộ trình"""
    CLEAR = "CLEAR"            # Tuyến đường hoàn toàn khô ráo
    CAUTION = "CAUTION"        # Có điểm ngập nhẹ hoặc lân cận, cần chú ý
    AVOID = "AVOID"            # Khuyến nghị né tránh, bẻ lộ trình khác


# ==========================================
# 1. TIDE DOMAIN: Trạm & Hằng số Điều hòa Thủy triều
# ==========================================

class TideStation(Base, TimestampMixin):
    """
    Trạm quan trắc thủy văn / thủy triều (ví dụ: Trạm Phú An, Nhà Bè, Vũng Tàu).
    Lưu trữ vị trí địa lý và thông số thủy chuẩn mốc 0 hải đồ.
    """
    __tablename__ = "tide_stations"

    station_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    station_code: Mapped[str] = mapped_column(String(30), unique=True, nullable=False, index=True, comment="Mã trạm (VD: PHU_AN, NHA_BE)")
    station_name: Mapped[str] = mapped_column(String(150), nullable=False, comment="Tên trạm thủy văn")
    river_system: Mapped[str] = mapped_column(String(100), default="Sông Sài Gòn", comment="Hệ thống sông liên kết")
    location = mapped_column(Geometry(geometry_type="POINT", srid=4326), nullable=False, comment="Tọa độ GPS trạm đo")
    
    datum_offset_meters: Mapped[float] = mapped_column(
        Numeric(5, 3), default=0.000, nullable=False, comment="Độ lệch so với mốc cao độ quốc gia (Mũi Nai / Hòn Dấu)"
    )
    mean_sea_level_meters: Mapped[float] = mapped_column(
        Numeric(5, 3), default=0.000, nullable=False, comment="Mực nước trung bình chuẩn (H0)"
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    constituents: Mapped[List["TideHarmonicConstituent"]] = relationship(
        back_populates="station", cascade="all, delete-orphan"
    )
    water_levels: Mapped[List["TideWaterLevelRecord"]] = relationship(
        back_populates="station", cascade="all, delete-orphan"
    )


class TideHarmonicConstituent(Base):
    """
    Bảng lưu các hằng số điều hòa thiên văn (Harmonic Constituents) của trạm thủy triều.
    Phục vụ thuật toán Pure Python Harmonic Tide Engine chạy độc lập, offline, cực nhanh.
    Bao gồm các sóng chính: M2 (Mặt Trăng), S2 (Mặt Trời), K1, O1 (Nhật triều)...
    """
    __tablename__ = "tide_harmonic_constituents"

    constituent_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    station_id: Mapped[int] = mapped_column(
        ForeignKey("tide_stations.station_id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(10), nullable=False, comment="Ký hiệu sóng (M2, S2, K1, O1, N2, P1...)")
    angular_speed_deg_per_hour: Mapped[float] = mapped_column(
        Numeric(10, 6), nullable=False, comment="Tốc độ góc omega (độ/giờ theo chu kỳ thiên văn)"
    )
    amplitude_meters: Mapped[float] = mapped_column(
        Numeric(6, 4), nullable=False, comment="Biên độ dao động sóng H (mét)"
    )
    phase_lag_degrees: Mapped[float] = mapped_column(
        Numeric(7, 3), nullable=False, comment="Pha trễ địa phương g (độ)"
    )

    station: Mapped["TideStation"] = relationship(back_populates="constituents")

    __table_args__ = (
        Index("uq_station_constituent", "station_id", "name", unique=True),
    )


class TideWaterLevelRecord(Base):
    """
    Nhật ký và dự báo mực nước thủy triều theo mốc thời gian.
    Lưu trữ kết quả tính toán định kỳ hoặc dữ liệu quan trắc thực tế từ cảm biến IoT.
    """
    __tablename__ = "tide_water_level_records"

    record_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    station_id: Mapped[int] = mapped_column(
        ForeignKey("tide_stations.station_id", ondelete="CASCADE"), nullable=False, index=True
    )
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    water_level_meters: Mapped[float] = mapped_column(Numeric(5, 3), nullable=False, comment="Mực nước dự báo/thực đo (m)")
    tide_state: Mapped[TideState] = mapped_column(String(20), default=TideState.RISING, nullable=False)
    alert_level: Mapped[TideAlertLevel] = mapped_column(String(20), default=TideAlertLevel.NORMAL, nullable=False)
    is_forecast: Mapped[bool] = mapped_column(Boolean, default=True, comment="True: Dự báo, False: Dữ liệu thực đo")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    station: Mapped["TideStation"] = relationship(back_populates="water_levels")

    __table_args__ = (
        Index("idx_tide_station_time", "station_id", "timestamp"),
        CheckConstraint("water_level_meters >= -3.0 AND water_level_meters <= 4.0", name="chk_valid_water_level"),
    )


# ==========================================
# 2. FLOOD DOMAIN: Điểm đen ngập & Đánh giá rủi ro
# ==========================================

class FloodHotspot(Base, TimestampMixin):
    """
    Điểm đen hoặc đoạn đường ngập úng cố hữu tại đô thị.
    Tích hợp PostGIS không gian (Tọa độ tâm Point và Đoạn đường corridor LineString).
    """
    __tablename__ = "flood_hotspots"

    hotspot_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    hotspot_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    street_name: Mapped[str] = mapped_column(String(200), nullable=False, index=True, comment="Tên tuyến đường (VD: Trần Xuân Soạn)")
    ward_name: Mapped[Optional[str]] = mapped_column(String(100), comment="Phường/Xã")
    district_name: Mapped[Optional[str]] = mapped_column(String(100), index=True, comment="Quận/Huyện")
    
    # Không gian địa lý PostGIS
    location = mapped_column(Geometry(geometry_type="POINT", srid=4326), nullable=False, comment="Tọa độ tâm điểm đen")
    road_corridor = mapped_column(Geometry(geometry_type="LINESTRING", srid=4326), nullable=True, comment="Đoạn đường chịu ảnh hưởng ngập")
    
    elevation_meters: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), comment="Cao độ mặt đường trung bình (m)")
    primary_cause: Mapped[FloodCauseType] = mapped_column(String(20), default=FloodCauseType.COMBINED, nullable=False)
    
    # Các ngưỡng kích hoạt ngập (Dynamic Trigger Thresholds)
    threshold_tide_meters: Mapped[float] = mapped_column(
        Numeric(4, 2), default=1.50, nullable=False, comment="Mực nước triều bắt đầu tràn mặt đường (m)"
    )
    threshold_rain_mm_per_hour: Mapped[float] = mapped_column(
        Numeric(5, 2), default=25.0, nullable=False, comment="Cường độ mưa kích hoạt ngập khi triều bình thường (mm/h)"
    )
    
    historical_max_depth_cm: Mapped[Optional[float]] = mapped_column(Numeric(5, 1), default=30.0, comment="Độ sâu ngập lịch sử kỷ lục (cm)")
    drainage_system_rating: Mapped[int] = mapped_column(Integer, default=3, comment="Đánh giá hệ thống thoát nước: 1(Kém) -> 5(Rất tốt)")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    risk_assessments: Mapped[List["FloodRiskAssessment"]] = relationship(
        back_populates="hotspot", cascade="all, delete-orphan"
    )
    community_reports: Mapped[List["FloodCommunityReport"]] = relationship(
        back_populates="hotspot", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("idx_flood_hotspot_loc", "location", postgresql_using="gist"),
        CheckConstraint("drainage_system_rating BETWEEN 1 AND 5", name="chk_drainage_rating_range"),
    )


class FloodRiskAssessment(Base):
    """
    Kết quả đánh giá rủi ro ngập úng động (Dynamic Flood Risk Evaluation) tại điểm đen.
    Được tính toán bởi Flood Risk Engine kết hợp: Mưa hiện tại/dự báo + Mực nước triều + Ngưỡng chịu tải của đường.
    """
    __tablename__ = "flood_risk_assessments"

    assessment_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    hotspot_id: Mapped[int] = mapped_column(
        ForeignKey("flood_hotspots.hotspot_id", ondelete="CASCADE"), nullable=False, index=True
    )
    evaluated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    
    # Các biến số đầu vào
    current_rainfall_mmh: Mapped[float] = mapped_column(Numeric(5, 2), default=0.0, comment="Cường độ mưa thực tế/dự báo (mm/h)")
    tide_water_level_m: Mapped[float] = mapped_column(Numeric(5, 3), default=1.0, comment="Mực nước triều tại thời điểm đánh giá (m)")
    
    # Kết quả tính toán
    calculated_risk_score: Mapped[float] = mapped_column(
        Numeric(4, 2), nullable=False, comment="Điểm số rủi ro chuẩn hóa (0.00: An toàn -> 10.00: Nguy hiểm tột độ)"
    )
    predicted_depth_cm: Mapped[float] = mapped_column(Numeric(5, 1), default=0.0, comment="Ước tính độ ngập nước mặt đường (cm)")
    severity_level: Mapped[FloodSeverityLevel] = mapped_column(String(20), default=FloodSeverityLevel.SAFE, nullable=False)
    is_impassable_for_bikes: Mapped[bool] = mapped_column(Boolean, default=False, comment="Xe máy có thể bị chết máy/nguy hiểm")
    is_impassable_for_cars: Mapped[bool] = mapped_column(Boolean, default=False, comment="Ô tô con gầm thấp có nguy cơ thủy kích")
    advisory_notice: Mapped[Optional[str]] = mapped_column(String(255), comment="Lời khuyên lộ trình cho người tham gia giao thông")

    hotspot: Mapped["FloodHotspot"] = relationship(back_populates="risk_assessments")

    __table_args__ = (
        Index("idx_flood_assessment_time", "hotspot_id", "evaluated_at"),
        CheckConstraint("calculated_risk_score >= 0.00 AND calculated_risk_score <= 10.00", name="chk_risk_score_bounds"),
    )


class FloodCommunityReport(Base, TimestampMixin):
    """
    Dữ liệu báo cáo điểm ngập realtime từ người đi đường (Crowdsourced Flood Reports).
    Cho phép người dùng bấm 1-chạm xác thực tình trạng đường phố.
    """
    __tablename__ = "flood_community_reports"

    report_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    hotspot_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("flood_hotspots.hotspot_id", ondelete="SET NULL"), nullable=True, index=True
    )
    reporter_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True, index=True
    )
    
    location = mapped_column(Geometry(geometry_type="POINT", srid=4326), nullable=False, comment="Tọa độ GPS người dùng đứng báo cáo")
    address_description: Mapped[str] = mapped_column(String(255), nullable=False)
    actual_depth_cm: Mapped[Optional[float]] = mapped_column(Numeric(5, 1), comment="Ước lượng độ sâu ngập (cm)")
    severity_level: Mapped[FloodSeverityLevel] = mapped_column(String(20), default=FloodSeverityLevel.MINOR, nullable=False)
    
    can_motorbike_pass: Mapped[bool] = mapped_column(Boolean, default=True, comment="Xe máy có qua được không?")
    can_car_pass: Mapped[bool] = mapped_column(Boolean, default=True, comment="Ô tô có qua được không?")
    
    image_url: Mapped[Optional[str]] = mapped_column(String(500), comment="Hình ảnh thực tế điểm ngập")
    note: Mapped[Optional[str]] = mapped_column(Text)
    
    upvotes: Mapped[int] = mapped_column(Integer, default=1, comment="Số người đồng ý xác nhận điểm ngập này còn ngập")
    downvotes: Mapped[int] = mapped_column(Integer, default=0, comment="Số người bấm báo cáo nước đã rút")
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, comment="Đã được hệ thống/kiểm duyệt viên duyệt")
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, comment="Hết hạn hiệu lực sau 2-4 giờ nếu không có báo cáo mới")

    hotspot: Mapped[Optional["FloodHotspot"]] = relationship(back_populates="community_reports")

    __table_args__ = (
        Index("idx_flood_report_loc", "location", postgresql_using="gist"),
    )


# ==========================================
# 3. ROUTING DOMAIN: Tuyến đường & Lộ trình Tránh ngập
# ==========================================

class SafeNavigationRoute(Base, TimestampMixin):
    """
    Lưu trữ và cache kết quả gợi ý tuyến đường tránh ngập cho người dùng.
    Hỗ trợ thuật toán Rerouting né các điểm đen có Risk Score cao.
    """
    __tablename__ = "safe_navigation_routes"

    route_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True, index=True
    )
    
    origin_point = mapped_column(Geometry(geometry_type="POINT", srid=4326), nullable=False)
    destination_point = mapped_column(Geometry(geometry_type="POINT", srid=4326), nullable=False)
    
    # Tuyến đường mặc định (nhanh nhất nhưng có thể ngập)
    default_route_geom = mapped_column(Geometry(geometry_type="LINESTRING", srid=4326), nullable=True)
    default_distance_meters: Mapped[float] = mapped_column(Numeric(10, 1), default=0.0)
    default_duration_seconds: Mapped[int] = mapped_column(Integer, default=0)
    default_route_hazard_count: Mapped[int] = mapped_column(Integer, default=0, comment="Số điểm ngập trên tuyến nhanh nhất")
    
    # Tuyến đường an toàn (được bẻ nhánh né ngập)
    recommended_safe_geom = mapped_column(Geometry(geometry_type="LINESTRING", srid=4326), nullable=True)
    recommended_distance_meters: Mapped[float] = mapped_column(Numeric(10, 1), default=0.0)
    recommended_duration_seconds: Mapped[int] = mapped_column(Integer, default=0)
    safety_status: Mapped[RouteSafetyStatus] = mapped_column(String(20), default=RouteSafetyStatus.CLEAR, nullable=False)
    
    avoided_hotspots_count: Mapped[int] = mapped_column(Integer, default=0, comment="Số điểm ngập nặng đã né thành công")
    route_details_json: Mapped[Optional[dict]] = mapped_column(JSONB, comment="Chi tiết các chặng turn-by-turn")

    __table_args__ = (
        Index("idx_nav_origin", "origin_point", postgresql_using="gist"),
        Index("idx_nav_dest", "destination_point", postgresql_using="gist"),
    )
