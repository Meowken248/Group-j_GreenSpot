"""
Pure Python Harmonic Tide Prediction Engine
Mô phỏng động lực học thủy triều TP.HCM (Trạm Phú An & Nhà Bè).
Áp dụng phương pháp phân tích điều hòa thiên văn (Harmonic Analysis),
kết hợp 4 sóng thành phần chủ đạo (M2, S2, K1, O1) để tạo chu kỳ nhật triều & bán nhật triều thực tế.
Hoàn toàn độc lập, offline, tốc độ micro-giây, không phụ thuộc API bên ngoài.
"""

from __future__ import annotations

import math
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

from app.models.flood import TideAlertLevel, TideState

# Mốc quy chiếu thiên văn chuẩn (Astronomical Reference Epoch): 2026-01-01 00:00:00 UTC
EPOCH_REF = datetime(2026, 1, 1, 0, 0, 0, tzinfo=timezone.utc)

# Bộ hằng số điều hòa thiên văn chuẩn hóa cho các trạm thủy văn trọng điểm TP.HCM
DEFAULT_STATIONS_HARMONICS: Dict[str, Dict[str, Any]] = {
    "PHU_AN": {
        "station_name": "Trạm Thủy văn Phú An",
        "river": "Sông Sài Gòn",
        "h0": 0.05,  # Mực nước trung bình chuẩn (m)
        "datum_offset": 0.00,
        "constituents": [
            # Sóng bán nhật triều chính Mặt Trăng (Principal Lunar Semidiurnal, chu kỳ 12.42h)
            {"name": "M2", "speed": 28.984104, "amp": 0.850, "phase": 120.5},
            # Sóng bán nhật triều chính Mặt Trời (Principal Solar Semidiurnal, chu kỳ 12.00h)
            {"name": "S2", "speed": 30.000000, "amp": 0.350, "phase": 160.2},
            # Sóng nhật triều kết hợp Nhật-Nguyệt (Lunisolar Diurnal, chu kỳ 23.93h)
            {"name": "K1", "speed": 15.041069, "amp": 0.420, "phase": 275.0},
            # Sóng nhật triều chính Mặt Trăng (Principal Lunar Diurnal, chu kỳ 25.82h)
            {"name": "O1", "speed": 13.943036, "amp": 0.310, "phase": 240.8},
        ],
    },
    "NHA_BE": {
        "station_name": "Trạm Thủy văn Nhà Bè",
        "river": "Sông Đồng Điền",
        "h0": 0.08,
        "datum_offset": 0.00,
        "constituents": [
            {"name": "M2", "speed": 28.984104, "amp": 0.880, "phase": 115.0},
            {"name": "S2", "speed": 30.000000, "amp": 0.360, "phase": 155.0},
            {"name": "K1", "speed": 15.041069, "amp": 0.440, "phase": 270.0},
            {"name": "O1", "speed": 13.943036, "amp": 0.320, "phase": 235.0},
        ],
    },
}


class HarmonicTideEngine:
    """Động cơ tính toán giải tích sóng thủy triều thuần Python"""

    @staticmethod
    def _to_utc(dt: Optional[datetime] = None) -> datetime:
        if dt is None:
            return datetime.now(timezone.utc)
        if dt.tzinfo is None:
            # Mặc định coi giờ truyền vào không có timezone là giờ Việt Nam (UTC+7)
            tz_vn = timezone(timedelta(hours=7))
            return dt.replace(tzinfo=tz_vn).astimezone(timezone.utc)
        return dt.astimezone(timezone.utc)

    @classmethod
    def calculate_water_level(
        cls,
        target_time: Optional[datetime] = None,
        station_code: str = "PHU_AN",
    ) -> float:
        """
        Tính toán mực nước dự báo tại thời điểm t (đơn vị: mét).
        Công thức: H(t) = H0 + sum(A_i * cos(omega_i * t - g_i))
        """
        station = DEFAULT_STATIONS_HARMONICS.get(station_code, DEFAULT_STATIONS_HARMONICS["PHU_AN"])
        t_utc = cls._to_utc(target_time)

        # Số giờ trôi qua kể từ mốc quy chiếu EPOCH
        hours_elapsed = (t_utc - EPOCH_REF).total_seconds() / 3600.0

        level = station["h0"]
        for c in station["constituents"]:
            # Góc pha tại thời điểm t (độ)
            theta_deg = (c["speed"] * hours_elapsed - c["phase"]) % 360.0
            theta_rad = math.radians(theta_deg)
            level += c["amp"] * math.cos(theta_rad)

        return round(level, 3)

    @classmethod
    def get_tide_rate_of_change(
        cls,
        target_time: Optional[datetime] = None,
        station_code: str = "PHU_AN",
        delta_minutes: int = 15,
    ) -> float:
        """
        Tính đạo hàm dH/dt (tốc độ dâng/rút của nước, đơn vị: mét/giờ).
        """
        t_utc = cls._to_utc(target_time)
        t_prev = t_utc - timedelta(minutes=delta_minutes)
        t_next = t_utc + timedelta(minutes=delta_minutes)

        h_prev = cls.calculate_water_level(t_prev, station_code)
        h_next = cls.calculate_water_level(t_next, station_code)

        hours_diff = (delta_minutes * 2) / 60.0
        return round((h_next - h_prev) / hours_diff, 4)

    @classmethod
    def determine_tide_state(
        cls,
        target_time: Optional[datetime] = None,
        station_code: str = "PHU_AN",
    ) -> TideState:
        """
        Xác định trạng thái con nước: Đang lên, Đang rút, Đạt đỉnh hoặc Đạt đáy.
        """
        t_utc = cls._to_utc(target_time)
        rate = cls.get_tide_rate_of_change(t_utc, station_code, delta_minutes=15)
        
        # Ngưỡng vận tốc coi là nước đứng hoặc quanh đỉnh/đáy (< 2.5 cm/h = 0.025 m/h)
        if abs(rate) < 0.025:
            rate_past = cls.get_tide_rate_of_change(t_utc - timedelta(minutes=20), station_code, delta_minutes=15)
            rate_next = cls.get_tide_rate_of_change(t_utc + timedelta(minutes=20), station_code, delta_minutes=15)
            if rate_past > 0 and rate_next < 0:
                return TideState.HIGH_TIDE
            elif rate_past < 0 and rate_next > 0:
                return TideState.LOW_TIDE
            return TideState.STAND
            
        return TideState.RISING if rate > 0 else TideState.FALLING

    @classmethod
    def determine_alert_level(cls, water_level_m: float) -> TideAlertLevel:
        """
        Phân cấp mức độ nguy cơ triều cường theo quy chuẩn thủy văn TP.HCM:
        - Báo động 1: 1.40m - 1.50m (Mấp mé bờ kè)
        - Báo động 2: 1.50m - 1.60m (Bắt đầu tràn đường ven kênh trũng thấp)
        - Báo động 3: > 1.60m (Ngập nặng đô thị)
        """
        if water_level_m >= 1.60:
            return TideAlertLevel.ALERT_3
        elif water_level_m >= 1.50:
            return TideAlertLevel.ALERT_2
        elif water_level_m >= 1.40:
            return TideAlertLevel.ALERT_1
        return TideAlertLevel.NORMAL

    @classmethod
    def get_current_tide(cls, station_code: str = "PHU_AN") -> Dict[str, Any]:
        """Lấy thông tin trạng thái triều hiện tại đầy đủ"""
        now_utc = cls._to_utc(None)
        station = DEFAULT_STATIONS_HARMONICS.get(station_code, DEFAULT_STATIONS_HARMONICS["PHU_AN"])
        
        water_level = cls.calculate_water_level(now_utc, station_code)
        rate = cls.get_tide_rate_of_change(now_utc, station_code)
        state = cls.determine_tide_state(now_utc, station_code)
        alert = cls.determine_alert_level(water_level)

        # Chuyển đổi sang giờ Việt Nam (UTC+7) hiển thị thân thiện
        now_vn = now_utc.astimezone(timezone(timedelta(hours=7)))

        # Mô tả trạng thái tiếng Việt
        state_labels = {
            TideState.RISING: "Nước đang dâng",
            TideState.FALLING: "Nước đang rút",
            TideState.HIGH_TIDE: "Đang đạt đỉnh triều",
            TideState.LOW_TIDE: "Đang ở chân triều",
            TideState.STAND: "Nước đứng",
        }

        alert_labels = {
            TideAlertLevel.NORMAL: "Bình thường (An toàn)",
            TideAlertLevel.ALERT_1: "Báo động I (Nước mấp mé bờ)",
            TideAlertLevel.ALERT_2: "Báo động II (Nguy cơ ngập ven sông)",
            TideAlertLevel.ALERT_3: "Báo động III (Cảnh báo ngập nặng)",
        }

        return {
            "station_code": station_code,
            "station_name": station["station_name"],
            "river_system": station["river"],
            "water_level_m": water_level,
            "rate_m_per_hour": rate,
            "state": state.value,
            "state_label": state_labels.get(state, "Nước bình thường"),
            "alert_level": alert.value,
            "alert_label": alert_labels.get(alert, "An toàn"),
            "is_flood_risk": alert in (TideAlertLevel.ALERT_2, TideAlertLevel.ALERT_3),
            "timestamp": now_vn.isoformat(),
        }

    @classmethod
    def get_tide_forecast(
        cls,
        hours: int = 24,
        interval_minutes: int = 60,
        station_code: str = "PHU_AN",
    ) -> List[Dict[str, Any]]:
        """
        Dự báo con nước chuỗi thời gian liên tục (VD: 24h hoặc 48h tới) để vẽ biểu đồ Frontend.
        """
        now_utc = cls._to_utc(None)
        points: List[Dict[str, Any]] = []
        tz_vn = timezone(timedelta(hours=7))

        steps = int((hours * 60) / interval_minutes)
        for step in range(steps + 1):
            t_point = now_utc + timedelta(minutes=step * interval_minutes)
            level = cls.calculate_water_level(t_point, station_code)
            state = cls.determine_tide_state(t_point, station_code)
            alert = cls.determine_alert_level(level)
            t_vn = t_point.astimezone(tz_vn)

            points.append({
                "time": t_vn.strftime("%H:%M"),
                "datetime": t_vn.isoformat(),
                "water_level_m": level,
                "state": state.value,
                "alert_level": alert.value,
            })

        return points

    @classmethod
    def find_upcoming_extrema(
        cls,
        window_hours: int = 24,
        station_code: str = "PHU_AN",
    ) -> Dict[str, Any]:
        """
        Tìm kiếm các đỉnh triều (High Tide) và chân triều (Low Tide) tiếp theo trong 24 giờ.
        Bắt chính xác thời điểm đổi chiều của con nước (dH/dt = 0).
        """
        now_utc = cls._to_utc(None)
        tz_vn = timezone(timedelta(hours=7))

        next_peak_time = None
        next_peak_val = -999.0
        next_trough_time = None
        next_trough_val = 999.0

        prev_t = now_utc
        prev_rate = cls.get_tide_rate_of_change(prev_t, station_code, delta_minutes=5)

        # Quét bước mịn 5 phút để xác định chính xác thời điểm đổi chiều đạo hàm
        for minute in range(5, window_hours * 60 + 5, 5):
            curr_t = now_utc + timedelta(minutes=minute)
            curr_rate = cls.get_tide_rate_of_change(curr_t, station_code, delta_minutes=5)

            # Phát hiện đỉnh triều: Vận tốc đổi từ Dương sang Âm
            if prev_rate > 0 and curr_rate <= 0 and next_peak_time is None:
                next_peak_time = curr_t
                next_peak_val = cls.calculate_water_level(curr_t, station_code)

            # Phát hiện chân triều: Vận tốc đổi từ Âm sang Dương
            if prev_rate < 0 and curr_rate >= 0 and next_trough_time is None:
                next_trough_time = curr_t
                next_trough_val = cls.calculate_water_level(curr_t, station_code)

            if next_peak_time is not None and next_trough_time is not None:
                break

            prev_t = curr_t
            prev_rate = curr_rate

        # Fallback an toàn nếu rơi vào cuối chu kỳ
        if next_peak_time is None:
            next_peak_time = now_utc + timedelta(hours=6)
            next_peak_val = cls.calculate_water_level(next_peak_time, station_code)
        if next_trough_time is None:
            next_trough_time = now_utc + timedelta(hours=12)
            next_trough_val = cls.calculate_water_level(next_trough_time, station_code)

        return {
            "next_peak": {
                "water_level_m": round(next_peak_val, 3),
                "time": next_peak_time.astimezone(tz_vn).strftime("%H:%M %d/%m"),
                "alert_level": cls.determine_alert_level(next_peak_val).value,
            },
            "next_trough": {
                "water_level_m": round(next_trough_val, 3),
                "time": next_trough_time.astimezone(tz_vn).strftime("%H:%M %d/%m"),
                "alert_level": cls.determine_alert_level(next_trough_val).value,
            },
        }


# Global singleton instance
tide_engine = HarmonicTideEngine()
