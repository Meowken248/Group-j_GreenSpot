"""
AI Triage & Priority Scoring Service (STT 39)
Pipeline Tóm tắt văn bản tự động & Thuật toán Chấm điểm Ưu tiên Xử lý TPS.
Tuân thủ đầy đủ SLA, XAI Explainability, Optimistic Locking (Quy tắc 7) và Soft Delete (Quy tắc 6).
"""

import math
import os
import re
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import httpx
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from app.core.config import settings
from app.models.incident import Incident, WasteCategory
from app.models.spatial import EssentialFacility
from app.models.audit_log import IncidentAuditLog


async def call_kira_ai(messages: list, timeout: Optional[float] = None) -> Optional[str]:
    """
    Gọi mô hình ngôn ngữ lớn Kira AI (hoặc bất kỳ LLM nào hỗ trợ chuẩn OpenAI).
    Toàn bộ các biến: API Key, API URL, Model Name, Timeout đều đọc động từ file .env.
    """
    api_key = settings.KIRA_API_KEY or os.getenv("KIRA_API_KEY", "")
    api_url = settings.KIRA_API_URL or os.getenv("KIRA_API_URL", "https://kiraai.vn/api/v1/chat/completions")
    model_name = settings.KIRA_MODEL or os.getenv("KIRA_MODEL", "kira-mini-1.0")
    req_timeout = timeout or settings.KIRA_TIMEOUT_SECONDS or float(os.getenv("KIRA_TIMEOUT_SECONDS", "45.0"))

    if not api_key:
        return None

    try:
        async with httpx.AsyncClient(timeout=req_timeout) as client:
            resp = await client.post(
                api_url,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model_name,
                    "messages": messages,
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                if content and len(content.strip()) > 0:
                    return content.strip()
    except Exception:
        # Fallback an toàn nếu có lỗi kết nối hoặc timeout
        pass
    return None


class TriageEvaluationResult(BaseModel):
    incident_id: uuid.UUID
    ai_summary: str
    is_too_short: bool
    summary_message: Optional[str]
    ai_triage_score: float
    ai_suggested_priority: str
    priority_color: str
    sla_response_hours: float
    sla_resolve_hours: float
    base_severity_score: float
    proximity_risk_score: float
    scale_factor_score: float
    urgency_nlp_score: float
    risk_factors: List[str]
    nearby_sensitive_facility: Optional[str] = None


def compute_tps_score(base_severity: float, proximity_risk: float, scale_factor: float, urgency_nlp: float) -> float:
    """
    Công thức: TPS = min( 100, BaseSeverity * 0.40 + ProximityRisk * 0.30 + ScaleFactor * 0.20 + UrgencyNLP * 0.10 )
    """
    score = (base_severity * 0.40) + (proximity_risk * 0.30) + (scale_factor * 0.20) + (urgency_nlp * 0.10)
    return round(min(100.0, max(0.0, score)), 2)


def calculate_proximity_risk(distance_meters: Optional[float]) -> float:
    """
    Khoảng cách d <= 50m -> 100 điểm; 50m < d <= 150m -> 75 điểm; 150m < d <= 300m -> 50 điểm; d > 300m -> 0 điểm.
    """
    if distance_meters is None or distance_meters > 300.0:
        return 0.0
    if distance_meters <= 50.0:
        return 100.0
    if distance_meters <= 150.0:
        return 75.0
    return 50.0


def calculate_scale_factor(area_m2: Optional[float]) -> float:
    """
    > 20m2 -> 100; 5 - 20m2 -> 70; < 5m2 -> 35
    """
    if area_m2 is None:
        return 35.0
    if area_m2 > 20.0:
        return 100.0
    if area_m2 >= 5.0:
        return 70.0
    return 35.0


def extract_urgency_nlp(text: str) -> Tuple[float, List[str]]:
    """
    Phân tích từ khóa cảnh báo và mức độ khẩn cấp trong văn bản.
    """
    if not text:
        return 0.0, []

    lower_text = text.lower()
    high_keywords = [
        "cháy", "nổ", "ngập sâu", "chết máy", "bốc mùi nồng nặc",
        "ruồi nhặng bùng phát dịch bệnh", "hóa chất độc hại", "chất độc", "rò rỉ"
    ]
    medium_keywords = [
        "ùn ứ", "tràn xuống cống", "chắn lối đi", "lưu cữu", "hôi thối", "nguy hiểm", "mùa mưa"
    ]

    found_high = [kw for kw in high_keywords if kw in lower_text]
    found_med = [kw for kw in medium_keywords if kw in lower_text]
    all_found = found_high + found_med

    if len(found_high) >= 2 or ("cháy" in found_high or "nổ" in found_high or "hóa chất độc hại" in found_high):
        return 100.0, all_found
    elif len(found_high) == 1:
        return 80.0, all_found
    elif len(found_med) >= 2:
        return 60.0, all_found
    elif len(found_med) == 1:
        return 40.0, all_found
    return 0.0, []


def determine_sla_and_priority(tps: float) -> Tuple[str, str, int, int]:
    """
    Phân bậc Ưu tiên và Khung thời hạn cam kết SLA:
    - Khẩn cấp (Critical - TPS >= 80): Gán nhãn Đỏ. SLA tiếp nhận: < 30 phút (0.5h); SLA hoàn thành: < 4 giờ.
    - Cao (High - 60 <= TPS < 80): Gán nhãn Cam. SLA tiếp nhận: < 2 giờ; SLA hoàn thành: < 12 giờ.
    - Trung bình (Medium - 40 <= TPS < 60): Gán nhãn Vàng. SLA tiếp nhận: < 4 giờ; SLA hoàn thành: < 24 giờ.
    - Thấp (Low - TPS < 40): Gán nhãn Xanh lục. SLA tiếp nhận: < 8 giờ; SLA hoàn thành: < 48 giờ.
    Trả về: (priority_vn, code, sla_receive_minutes, sla_resolve_hours)
    """
    if tps >= 80.0:
        return "Khẩn cấp", "CRITICAL", 30, 4
    elif tps >= 60.0:
        return "Cao", "HIGH", 120, 12
    elif tps >= 40.0:
        return "Trung bình", "MEDIUM", 240, 24
    else:
        return "Thấp", "LOW", 480, 48


class AITriageService:

    @staticmethod
    def generate_summary(description: str, address_text: str = "", category_name: str = "") -> Tuple[str, bool]:
        """
        Abstractive Summarization Pipeline:
        - Nếu < 10 ký tự: Báo lỗi "Mô tả sự cố quá ngắn để AI tóm tắt", giữ nguyên nguyên văn.
        - Nếu hợp lệ: Rút trích cô đọng 2-3 câu (< 50 từ).
        """
        clean_desc = (description or "").strip()
        if len(clean_desc) < 10:
            return f"{clean_desc} (Ghi chú: Mô tả sự cố quá ngắn để AI tóm tắt)", True

        # Trích xuất các ý chính
        words = clean_desc.split()
        if len(words) <= 30:
            # Ngắn vừa vặn -> tinh chỉnh làm nổi bật từ khóa hành động
            summary = f"{clean_desc}. Cần điều động nhân sự và phương tiện chuyên dụng kiểm tra, xử lý hiện trường."
        else:
            first_sentence = clean_desc.split(".")[0]
            summary = (
                f"{first_sentence}. Bãi ô nhiễm có nguy cơ ảnh hưởng trực tiếp đến cảnh quan đô thị và nguồn nước mặt. "
                f"Đề xuất cử đội môi trường thu gom và khử khuẩn dứt điểm."
            )

        # Cắt ngắn nếu vượt 50-60 từ
        sum_words = summary.split()
        if len(sum_words) > 55:
            summary = " ".join(sum_words[:50]) + "..."
        return summary, False

    @classmethod
    async def generate_summary_ai(
        cls,
        description: str,
        address_text: str = "",
        category_name: str = ""
    ) -> Tuple[str, bool]:
        """
        Abstractive Summarization Pipeline qua Kira AI (kira-mini-1.0):
        - Nếu < 10 ký tự: Báo lỗi "Mô tả sự cố quá ngắn để AI tóm tắt", giữ nguyên nguyên văn.
        - Gọi Kira AI sinh bản tóm tắt 2-3 câu cô đọng (< 50 từ).
        - Tự động fallback về thuật toán heuristic nếu API timeout hoặc mạng chậm.
        """
        clean_desc = (description or "").strip()
        if len(clean_desc) < 10:
            return f"{clean_desc} (Ghi chú: Mô tả sự cố quá ngắn để AI tóm tắt)", True

        messages = [
            {
                "role": "system",
                "content": (
                    "Bạn là trợ lý AI thẩm định môi trường của nền tảng GreenSpot. "
                    "Nhiệm vụ của bạn là đọc hiểu báo cáo phản ánh sự cố môi trường của công dân "
                    "và tóm tắt thành 2-3 câu cô đọng (dưới 50 từ). "
                    "Nêu rõ: 1. Loại rác/chất thải chính, 2. Quy mô ước tính, "
                    "3. Tác động môi trường hoặc cản trở giao thông và đề xuất hướng xử lý. "
                    "Viết bằng tiếng Việt súc tích, văn phong hiện trường, không mở đầu rườm rà."
                )
            },
            {
                "role": "user",
                "content": (
                    f"Báo cáo sự cố: {clean_desc}\n"
                    f"Địa chỉ: {address_text or 'Chưa rõ'}\n"
                    f"Phân loại: {category_name or 'Chưa phân loại'}\n"
                    "Hãy tóm tắt ngắn gọn 2-3 câu:"
                )
            }
        ]

        kira_result = await call_kira_ai(messages, timeout=35.0)
        if kira_result:
            cleaned = re.sub(r"\s*\*\(\d+\s*từ\)\*", "", kira_result, flags=re.IGNORECASE).strip()
            return cleaned, False

        return cls.generate_summary(description, address_text, category_name)

    @classmethod
    async def evaluate_incident(cls, db: AsyncSession, incident_id: uuid.UUID) -> TriageEvaluationResult:
        """
        Thực hiện đánh giá toàn diện AI Triage và Explainable AI (XAI) cho một sự cố.
        """
        stmt = select(Incident).where(
            Incident.incident_id == incident_id,
            Incident.deleted_at.is_(None)
        )
        res = await db.execute(stmt)
        inc = res.scalars().first()
        if not inc:
            raise HTTPException(status_code=404, detail="Không tìm thấy sự cố")

        # 1. BaseSeverity
        base_severity = 50.0
        if inc.category_id:
            cat_stmt = select(WasteCategory).where(WasteCategory.category_id == inc.category_id)
            cat_res = await db.execute(cat_stmt)
            cat = cat_res.scalars().first()
            if cat:
                code = (cat.category_code or "").upper()
                if "HAZARD" in code or "CHEM" in code:
                    base_severity = 100.0
                elif "DRAIN" in code or "CONG" in code:
                    base_severity = 80.0
                elif "DOMESTIC" in code or "SINH_HOAT" in code:
                    base_severity = 60.0
                elif "ORGANIC" in code or "DRY" in code:
                    base_severity = 25.0

        # 2. ProximityRisk: Tìm cơ sở thiết yếu gần nhất qua PostGIS
        proximity_risk = 0.0
        nearest_fac_name = None
        min_distance = None

        if inc.location is not None:
            # Bounding box 3km tối ưu hóa truy vấn PostGIS ST_Distance
            inc_lat = float(inc.latitude) if inc.latitude else 10.7769
            inc_lng = float(inc.longitude) if inc.longitude else 106.7009
            delta_lat = 3000.0 / 111000.0
            delta_lng = 3000.0 / (111000.0 * max(0.2, math.cos(math.radians(inc_lat))))

            fac_stmt = (
                select(
                    EssentialFacility.facility_name,
                    func.ST_Distance(
                        func.ST_Transform(EssentialFacility.location, 3857),
                        func.ST_Transform(inc.location, 3857)
                    ).label("dist_m")
                )
                .where(
                    EssentialFacility.deleted_at.is_(None),
                    func.ST_Y(EssentialFacility.location) >= inc_lat - delta_lat,
                    func.ST_Y(EssentialFacility.location) <= inc_lat + delta_lat,
                    func.ST_X(EssentialFacility.location) >= inc_lng - delta_lng,
                    func.ST_X(EssentialFacility.location) <= inc_lng + delta_lng,
                )
                .order_by("dist_m")
                .limit(1)
            )
            try:
                fac_res = await db.execute(fac_stmt)
                row = fac_res.first()
                if row:
                    nearest_fac_name = row[0]
                    min_distance = float(row[1])
                    proximity_risk = calculate_proximity_risk(min_distance)
            except Exception:
                # Fallback khoảng cách nếu PostGIS transform chưa hỗ trợ
                proximity_risk = 0.0

        # 3. ScaleFactor
        area_m2 = 10.0
        if inc.estimated_volume_m3:
            area_m2 = float(inc.estimated_volume_m3) * 2.0
        scale_factor = calculate_scale_factor(area_m2)

        # 4. UrgencyNLP
        urgency_nlp, detected_kws = extract_urgency_nlp(inc.description or "")

        # 5. TPS Calculation
        tps = compute_tps_score(base_severity, proximity_risk, scale_factor, urgency_nlp)
        priority_vn, code, sla_rec_m, sla_res_h = determine_sla_and_priority(tps)

        # 6. Risk Factors (XAI Explainability)
        risk_factors = []
        if base_severity >= 80.0:
            risk_factors.append("Chứa chất thải nguy hại y tế hoặc cản trở cống thoát nước")
        if min_distance is not None and min_distance <= 50.0:
            risk_factors.append(f"Gần cơ sở thiết yếu < 50m ({nearest_fac_name})")
        elif min_distance is not None and min_distance <= 150.0:
            risk_factors.append(f"Nằm trong phạm vi 150m tới {nearest_fac_name}")

        if "ngập sâu" in inc.description.lower() or "ngập úng" in inc.description.lower():
            risk_factors.append("Ngập úng sâu khi trời mưa")
        if "chắn lối" in inc.description.lower() or "chắn lối đi" in inc.description.lower():
            risk_factors.append("Chắn lối đi ngõ hẻm")
        if "bốc mùi" in inc.description.lower() or "ruồi nhặng" in inc.description.lower():
            risk_factors.append("Bốc mùi nồng nặc và nguy cơ phát tán dịch bệnh")

        if not risk_factors:
            risk_factors.append("Không phát hiện yếu tố rủi ro đặc biệt")

        # 7. Summary qua Kira AI
        cat_name = ""
        if inc.category_id:
            cat_stmt = select(WasteCategory).where(WasteCategory.category_id == inc.category_id)
            cat_res = await db.execute(cat_stmt)
            cat = cat_res.scalars().first()
            if cat:
                cat_name = cat.name

        summary, is_short = await cls.generate_summary_ai(inc.description, inc.address_text, cat_name)

        # Màu hiển thị
        color_map = {
            "Khẩn cấp": "red",
            "Cao": "orange",
            "Trung bình": "yellow",
            "Thấp": "green"
        }

        # Lưu cache vào incident
        inc.ai_summary = summary
        inc.ai_triage_score = tps
        inc.ai_suggested_priority = priority_vn
        inc.ai_factors = {
            "base_severity": base_severity,
            "proximity_risk": proximity_risk,
            "scale_factor": scale_factor,
            "urgency_nlp": urgency_nlp,
            "risk_factors": risk_factors,
            "nearest_facility": nearest_fac_name,
            "min_distance_m": min_distance
        }
        inc.ai_generated_at = datetime.utcnow()
        await db.commit()

        return TriageEvaluationResult(
            incident_id=inc.incident_id,
            ai_summary=summary,
            is_too_short=is_short,
            summary_message="Mô tả sự cố quá ngắn để AI tóm tắt" if is_short else None,
            ai_triage_score=tps,
            ai_suggested_priority=priority_vn,
            priority_color=color_map.get(priority_vn, "orange"),
            sla_response_hours=round(sla_rec_m / 60.0, 1),
            sla_resolve_hours=float(sla_res_h),
            base_severity_score=base_severity,
            proximity_risk_score=proximity_risk,
            scale_factor_score=scale_factor,
            urgency_nlp_score=urgency_nlp,
            risk_factors=risk_factors,
            nearby_sensitive_facility=nearest_fac_name,
        )

    @classmethod
    async def regenerate_summary(cls, db: AsyncSession, incident_id: uuid.UUID) -> str:
        """
        Nút "Tạo lại tóm tắt": Làm mới bản tóm tắt AI qua Kira AI.
        """
        stmt = select(Incident).where(
            Incident.incident_id == incident_id,
            Incident.deleted_at.is_(None)
        )
        res = await db.execute(stmt)
        inc = res.scalars().first()
        if not inc:
            raise HTTPException(status_code=404, detail="Không tìm thấy sự cố")

        desc = inc.description or ""
        if len(desc.strip()) < 10:
            summary = f"{desc} (Ghi chú: Mô tả sự cố quá ngắn để AI tóm tắt)"
        else:
            messages = [
                {
                    "role": "system",
                    "content": (
                        "Bạn là trợ lý AI thẩm định môi trường của nền tảng GreenSpot. "
                        "Cán bộ tiếp nhận yêu cầu bạn TẠO LẠI BẢN TÓM TẮT AI theo góc nhìn điều hành tác nghiệp khẩn. "
                        "Hãy viết đoạn tóm tắt 2-3 câu (dưới 50 từ), nhấn mạnh vào rủi ro môi trường, an toàn cộng đồng "
                        "và yêu cầu phân công phương tiện thu gom dọn rác đúng thời hạn SLA."
                    )
                },
                {
                    "role": "user",
                    "content": f"Báo cáo sự cố: {desc.strip()}\nĐịa chỉ: {inc.address_text or ''}\nHãy viết lại bản tóm tắt mới:"
                }
            ]
            kira_result = await call_kira_ai(messages, timeout=35.0)
            if kira_result:
                summary = re.sub(r"\s*\*\(\d+\s*từ\)\*", "", kira_result, flags=re.IGNORECASE).strip()
            else:
                summary = (
                    f"Hiện trường ghi nhận: {desc.strip()[:120]}... Đã phân loại mức độ rủi ro "
                    f"{inc.ai_suggested_priority or 'ưu tiên'}. Đội điều phối cần sớm bố trí phương tiện thu gom."
                )

        inc.ai_summary = summary
        inc.ai_generated_at = datetime.utcnow()

        # Ghi log kiểm toán
        audit = IncidentAuditLog(
            incident_id=inc.incident_id,
            action="AI_TRIAGE_REGENERATED",
            new_priority=inc.ai_suggested_priority,
            risk_score=int(round(float(inc.ai_triage_score))) if inc.ai_triage_score is not None else None,
            reason="Cán bộ yêu cầu làm mới tóm tắt AI",
            version=inc.version,
        )
        db.add(audit)
        await db.commit()
        return summary

    @classmethod
    async def accept_ai_priority(
        cls,
        db: AsyncSession,
        incident_id: uuid.UUID,
        operator_id: Optional[uuid.UUID],
        expected_version: int,
    ) -> Incident:
        """
        Nút "Chấp nhận": Đồng thuận với đề xuất AI, gán trực tiếp vào phiếu việc và kích hoạt SLA.
        Kiểm tra Optimistic Locking (Quy tắc 7).
        """
        stmt = select(Incident).where(
            Incident.incident_id == incident_id,
            Incident.deleted_at.is_(None)
        )
        res = await db.execute(stmt)
        inc = res.scalars().first()
        if not inc:
            raise HTTPException(status_code=404, detail="Không tìm thấy sự cố")

        if inc.version != expected_version:
            raise HTTPException(
                status_code=409,
                detail="Dữ liệu sự cố đã bị cập nhật bởi người khác (Version conflict). Vui lòng tải lại!"
            )

        old_p = inc.severity
        new_p = inc.ai_suggested_priority or "Cao"
        now = datetime.utcnow()

        # Tính SLA hoàn thành
        hours_map = {"Khẩn cấp": 4, "Cao": 12, "Trung bình": 24, "Thấp": 48}
        sla_hours = hours_map.get(new_p, 24)

        inc.severity = new_p
        inc.status = "IN_PROGRESS"
        inc.sla_deadline = now + timedelta(hours=sla_hours)
        inc.version += 1

        # Ghi Audit Log
        audit = IncidentAuditLog(
            incident_id=inc.incident_id,
            action="PRIORITY_ACCEPTED",
            old_priority=old_p,
            new_priority=new_p,
            risk_score=int(round(float(inc.ai_triage_score))) if inc.ai_triage_score is not None else None,
            performed_by=operator_id,
            reason="Cán bộ đồng thuận với mức đề xuất của AI",
            version=inc.version,
        )
        db.add(audit)
        await db.commit()
        await db.refresh(inc)
        return inc

    @classmethod
    async def override_priority(
        cls,
        db: AsyncSession,
        incident_id: uuid.UUID,
        new_priority: str,
        reason: str,
        operator_id: Optional[uuid.UUID],
        expected_version: int,
    ) -> Incident:
        """
        Màn 3/3 Popup Human-in-the-loop: Cán bộ can thiệp điều chỉnh mức ưu tiên.
        Bắt buộc lý do ghi chú (<= 200 ký tự). Kiểm tra Optimistic Locking (Quy tắc 7).
        """
        clean_reason = (reason or "").strip()
        if not clean_reason:
            raise ValueError("Vui lòng nhập lý do thay đổi mức ưu tiên")
        if len(clean_reason) > 200:
            raise ValueError("Lý do thay đổi mức ưu tiên không được vượt quá 200 ký tự")

        stmt = select(Incident).where(
            Incident.incident_id == incident_id,
            Incident.deleted_at.is_(None)
        )
        res = await db.execute(stmt)
        inc = res.scalars().first()
        if not inc:
            raise HTTPException(status_code=404, detail="Không tìm thấy sự cố")

        # Kiểm tra OCC Lock
        if inc.version != expected_version:
            raise HTTPException(
                status_code=409,
                detail="Dữ liệu sự cố đã bị cập nhật bởi người khác (Version conflict). Vui lòng tải lại!"
            )

        old_p = inc.severity
        now = datetime.utcnow()
        hours_map = {"Khẩn cấp": 4, "Cao": 12, "Trung bình": 24, "Thấp": 48}
        sla_hours = hours_map.get(new_priority, 24)

        inc.severity = new_priority
        inc.priority_modified_by = operator_id
        inc.priority_modified_reason = clean_reason
        inc.priority_modified_at = now
        inc.sla_deadline = now + timedelta(hours=sla_hours)
        inc.version += 1

        # Ghi Audit Log
        audit = IncidentAuditLog(
            incident_id=inc.incident_id,
            action="PRIORITY_OVERRIDDEN",
            old_priority=old_p,
            new_priority=new_priority,
            risk_score=int(round(float(inc.ai_triage_score))) if inc.ai_triage_score is not None else None,
            reason=clean_reason,
            performed_by=operator_id,
            version=inc.version,
        )
        db.add(audit)
        await db.commit()
        await db.refresh(inc)
        return inc
