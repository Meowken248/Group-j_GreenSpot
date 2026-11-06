import math
from datetime import datetime
from typing import List, Tuple
import numpy as np


class AIDeduplicationService:
    """
    Động cơ AI thông minh đối soát và phát hiện báo cáo sự cố trùng lặp.
    Thuật toán AI kết hợp đối soát 3 yếu tố:
    1. Khoảng cách tọa độ GPS (< 50m)
    2. Khoảng cách thời gian (< 48 giờ)
    3. Độ tương đồng hình ảnh hiện trường (Computer Vision Image Embedding > 80%)
    """

    EARTH_RADIUS_METERS = 6371000.0
    GPS_THRESHOLD_METERS = 50.0       # Tối đa 50 mét
    TIME_THRESHOLD_HOURS = 48.0       # Tối đa 48 giờ
    IMAGE_SIMILARITY_THRESHOLD = 80.0 # Tối thiểu 80%

    @staticmethod
    def calculate_gps_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """
        Tính khoảng cách đại cầu (Haversine formula) giữa 2 tọa độ GPS theo mét.
        """
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)

        a = (
            math.sin(delta_phi / 2.0) ** 2
            + math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2)
        )
        c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(max(0.0, 1.0 - a)))
        return round(AIDeduplicationService.EARTH_RADIUS_METERS * c, 2)

    @staticmethod
    def calculate_time_diff_hours(t1: datetime, t2: datetime) -> float:
        """
        Tính khoảng cách thời gian gửi báo cáo theo giờ (hours).
        """
        diff_seconds = abs((t1 - t2).total_seconds())
        return round(diff_seconds / 3600.0, 2)

    @staticmethod
    def compute_embedding_similarity(vec1: List[float], vec2: List[float]) -> float:
        """
        Tính độ tương đồng Cosine giữa 2 vector đặc trưng thị giác (CV Image Embeddings).
        Đưa về thang đo phần trăm [0% - 100%].
        """
        a = np.array(vec1, dtype=float)
        b = np.array(vec2, dtype=float)
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        if norm_a == 0 or norm_b == 0:
            return 0.0
        cosine = float(np.dot(a, b) / (norm_a * norm_b))
        similarity = max(0.0, min(100.0, cosine * 100.0))
        return round(similarity, 2)

    @staticmethod
    def evaluate_duplicate_pair(
        lat1: float, lon1: float, t1: datetime, image_sim: float,
        lat2: float, lon2: float, t2: datetime
    ) -> Tuple[bool, float, float, float, float, str]:
        """
        Đánh giá toàn diện một cặp báo cáo:
        Trả về: (is_duplicate, combined_similarity, gps_distance, time_diff_hours, image_sim, explanation)
        """
        gps_distance = AIDeduplicationService.calculate_gps_distance_meters(lat1, lon1, lat2, lon2)
        time_diff = AIDeduplicationService.calculate_time_diff_hours(t1, t2)

        # Kiểm tra 3 điều kiện tiên quyết
        is_gps_valid = gps_distance <= AIDeduplicationService.GPS_THRESHOLD_METERS
        is_time_valid = time_diff <= AIDeduplicationService.TIME_THRESHOLD_HOURS
        is_image_valid = image_sim >= AIDeduplicationService.IMAGE_SIMILARITY_THRESHOLD

        is_duplicate = is_gps_valid and is_time_valid and is_image_valid

        # Tính tổng hợp tỷ lệ tương đồng AI: 60% hình ảnh + 25% vị trí địa lý + 15% thời gian
        gps_score = max(0.0, 100.0 - (gps_distance / AIDeduplicationService.GPS_THRESHOLD_METERS) * 20.0)
        time_score = max(0.0, 100.0 - (time_diff / AIDeduplicationService.TIME_THRESHOLD_HOURS) * 20.0)
        combined_similarity = round(0.60 * image_sim + 0.25 * gps_score + 0.15 * time_score, 1)

        explanation = (
            f"Khoảng cách GPS: {gps_distance}m ({'Đạt <50m' if is_gps_valid else 'Không đạt'}); "
            f"Khoảng cách thời gian: {time_diff} giờ ({'Đạt <48h' if is_time_valid else 'Không đạt'}); "
            f"Độ tương đồng hình ảnh CV: {image_sim}% ({'Đạt >80%' if is_image_valid else 'Không đạt'}). "
            f"AI xác định tỷ lệ trùng lặp: {combined_similarity}%."
        )

        return (is_duplicate, combined_similarity, gps_distance, time_diff, image_sim, explanation)


ai_deduplication_service = AIDeduplicationService()
