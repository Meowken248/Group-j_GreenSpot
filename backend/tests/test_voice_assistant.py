"""
Unit & Integration Tests: Trợ lý giọng nói rảnh tay (Hands-free Voice Assistant)
Kiểm thử toàn diện:
1. Chuẩn hóa ngữ âm tiếng Việt & ngắt câu (Vietnamese Text Normalization)
2. Phân loại Ý định (NLU Intent Classification) cho các kịch bản thực tế
3. Trích xuất tham số thực thể (Slot Extraction: Địa điểm, Quận huyện)
4. Cơ chế Fallback khi gặp câu lệnh lạ
5. API Endpoints qua FastAPI TestClient
"""

import asyncio
from unittest.mock import AsyncMock, MagicMock
from fastapi.testclient import TestClient

from app.main import app
from app.models.voice import VoiceActionType, VoiceSampleCommand
from app.schemas.voice import VoiceProcessRequest
from app.services.voice_service import VoiceNluService, voice_service


def test_vietnamese_text_normalization():
    """Kiểm tra AI chuẩn hóa câu nói: viết hoa đầu câu, ngắt câu, viết hoa danh từ riêng & địa danh"""
    service = VoiceNluService()

    # 1. Chuẩn hóa địa danh và câu trần thuật
    raw_1 = "báo cáo bãi rác ngã tư lê lợi"
    norm_1 = service.normalize_text(raw_1)
    assert norm_1 == "Báo cáo bãi rác ngã tư Lê Lợi.", f"Kết quả không như kỳ vọng: {norm_1}"

    # 2. Chuẩn hóa câu hỏi
    raw_2 = "đường nào an toàn không bị ngập"
    norm_2 = service.normalize_text(raw_2)
    assert norm_2 == "Đường nào an toàn không bị ngập?", f"Kết quả không như kỳ vọng: {norm_2}"

    # 3. Chuẩn hóa Quận và từ viết tắt
    raw_3 = "chất lượng không khí quận 1 hôm nay"
    norm_3 = service.normalize_text(raw_3)
    assert "Quận 1" in norm_3
    assert norm_3.startswith("Chất lượng")

    # 4. Loại bỏ khoảng trắng thừa
    raw_4 = "   xem   số   dư ví   điểm   "
    norm_4 = service.normalize_text(raw_4)
    assert norm_4 == "Xem số dư ví điểm."


def test_intent_matching_report_incident():
    """Kịch bản: Người dân báo cáo bãi rác tại ngã tư Lê Lợi"""
    service = VoiceNluService()
    commands = [
        VoiceSampleCommand(
            command_text="Báo cáo bãi rác gần đây",
            intent_code="REPORT_INCIDENT",
            action_type=VoiceActionType.NAVIGATION.value,
            action_target="/report-incident",
            default_response="Đang mở biểu mẫu Báo cáo sự cố rác thải cho bạn.",
            is_active=True,
        )
    ]

    text = "Báo cáo bãi rác ngã tư Lê Lợi."
    intent, conf, action, target, resp = service.match_intent(text, commands)

    assert intent == "REPORT_INCIDENT"
    assert conf >= 0.90
    assert action == VoiceActionType.NAVIGATION.value
    assert target == "/report-incident"
    assert "ngã tư Lê Lợi" in resp or "Báo cáo" in resp


def test_intent_matching_safe_route():
    """Kịch bản: Người dân hỏi đường nào an toàn không bị ngập"""
    service = VoiceNluService()
    commands = [
        VoiceSampleCommand(
            command_text="Đường nào an toàn không bị ngập?",
            intent_code="CHECK_SAFE_ROUTE",
            action_type=VoiceActionType.NAVIGATION.value,
            action_target="map_flood",
            default_response="Đang hiển thị bản đồ các tuyến đường an toàn không bị ngập nước.",
            is_active=True,
        )
    ]

    text = "Đường nào an toàn không bị ngập?"
    intent, conf, action, target, resp = service.match_intent(text, commands)

    assert intent == "CHECK_SAFE_ROUTE"
    assert conf == 1.0  # Exact match
    assert action == VoiceActionType.NAVIGATION.value
    assert target == "map_flood"


def test_intent_matching_wallet():
    """Kịch bản: Người dân kiểm tra số dư ví điểm xanh"""
    service = VoiceNluService()
    commands = [
        VoiceSampleCommand(
            command_text="Xem số dư ví điểm",
            intent_code="CHECK_REWARD_WALLET",
            action_type=VoiceActionType.LOOKUP.value,
            action_target="/wallet",
            default_response="Số dư ví điểm xanh của bạn hiện có 350 điểm GreenPoints.",
            is_active=True,
        )
    ]

    text = "Xem số dư ví điểm."
    intent, conf, action, target, resp = service.match_intent(text, commands)

    assert intent == "CHECK_REWARD_WALLET"
    assert action == VoiceActionType.LOOKUP.value
    assert target == "/wallet"
    assert "350 điểm" in resp


def test_intent_matching_air_quality():
    """Kịch bản: Người dân mở bản đồ chất lượng không khí"""
    service = VoiceNluService()
    commands = [
        VoiceSampleCommand(
            command_text="Mở bản đồ chất lượng không khí",
            intent_code="OPEN_AIR_QUALITY_MAP",
            action_type=VoiceActionType.NAVIGATION.value,
            action_target="dashboard_aqi",
            default_response="Đang mở bản đồ quan trắc chất lượng không khí và chỉ số AQI.",
            is_active=True,
        )
    ]

    text = "Mở bản đồ chất lượng không khí."
    intent, conf, action, target, resp = service.match_intent(text, commands)

    assert intent == "OPEN_AIR_QUALITY_MAP"
    assert action == VoiceActionType.NAVIGATION.value
    assert target == "dashboard_aqi"


def test_intent_fallback_unknown():
    """Kịch bản: Người dùng ra câu lệnh không liên quan -> Hệ thống Fallback nhẹ nhàng"""
    service = VoiceNluService()
    commands = [
        VoiceSampleCommand(
            command_text="Báo cáo bãi rác gần đây",
            intent_code="REPORT_INCIDENT",
            action_type=VoiceActionType.NAVIGATION.value,
            action_target="/report-incident",
            default_response="Đang mở biểu mẫu Báo cáo sự cố rác thải cho bạn.",
            is_active=True,
        ),
        VoiceSampleCommand(
            command_text="Đường nào an toàn không bị ngập?",
            intent_code="CHECK_SAFE_ROUTE",
            action_type=VoiceActionType.NAVIGATION.value,
            action_target="map_flood",
            default_response="Đang hiển thị bản đồ.",
            is_active=True,
        ),
    ]

    text = "Hôm nay ăn gì ngon bổ rẻ ở Sài Gòn."
    intent, conf, action, target, resp = service.match_intent(text, commands)

    assert intent is None
    assert conf == 0.0
    assert action == VoiceActionType.UNKNOWN.value
    assert "Xin lỗi, tôi chưa hiểu lệnh này. Bạn có thể thử lại các câu gợi ý" in resp


async def test_process_voice_command_service_execution():
    """Kiểm tra hàm xử lý service toàn trình với mock database session"""
    mock_repo = MagicMock()
    mock_repo.get_all_sample_commands = AsyncMock(return_value=[
        VoiceSampleCommand(
            command_text="Báo cáo bãi rác gần đây",
            intent_code="REPORT_INCIDENT",
            action_type=VoiceActionType.NAVIGATION.value,
            action_target="/report-incident",
            default_response="Đang mở biểu mẫu Báo cáo sự cố rác thải cho bạn.",
            is_active=True,
        )
    ])
    mock_repo.create_interaction_log = AsyncMock(return_value=None)

    service = VoiceNluService(mock_repo)
    mock_db = AsyncMock()

    request = VoiceProcessRequest(
        transcript="báo cáo bãi rác ngã tư lê lợi",
        session_source="VOICE",
    )

    response = await service.process_voice_command(mock_db, request)

    assert response.normalized_text == "Báo cáo bãi rác ngã tư Lê Lợi."
    assert response.detected_intent == "REPORT_INCIDENT"
    assert response.is_success is True
    assert response.action_type == "NAVIGATION"
    assert response.action_target == "/report-incident"
    assert response.action_payload is not None
    assert response.action_payload["incident_type"] == "WASTE"
    assert mock_repo.create_interaction_log.called


from app.database import get_db


def test_api_suggestions_endpoint():
    """Kiểm tra Endpoint GET /api/v1/voice/suggestions"""
    async def override_get_db():
        mock_session = AsyncMock()
        mock_session.execute = AsyncMock(side_effect=Exception("DB offline simulation"))
        yield mock_session

    app.dependency_overrides[get_db] = override_get_db
    try:
        with TestClient(app) as client:
            res = client.get("/api/v1/voice/suggestions")
            assert res.status_code == 200
            data = res.json()
            assert isinstance(data, list)
            assert len(data) >= 1
            sample_texts = [d["command_text"] for d in data]
            assert "Báo cáo bãi rác gần đây" in sample_texts
    finally:
        app.dependency_overrides.clear()


def test_api_process_command_endpoint():
    """Kiểm tra Endpoint POST /api/v1/voice/process qua TestClient"""
    async def override_get_db():
        mock_session = AsyncMock()
        yield mock_session

    app.dependency_overrides[get_db] = override_get_db
    try:
        with TestClient(app) as client:
            payload = {
                "transcript": "Đường nào an toàn không bị ngập?",
                "session_source": "SUGGESTION_CLICK",
            }
            res = client.post("/api/v1/voice/process", json=payload)
            assert res.status_code == 200
            data = res.json()
            assert data["detected_intent"] == "CHECK_SAFE_ROUTE"
            assert data["is_success"] is True
            assert data["action_type"] == "NAVIGATION"
            assert data["action_target"] == "map_flood"
            assert "an toàn" in data["response_text"]
    finally:
        app.dependency_overrides.clear()


if __name__ == "__main__":
    print("[*] Running Voice Assistant Unit Tests...")
    test_vietnamese_text_normalization()
    test_intent_matching_report_incident()
    test_intent_matching_safe_route()
    test_intent_matching_wallet()
    test_intent_matching_air_quality()
    test_intent_fallback_unknown()
    asyncio.run(test_process_voice_command_service_execution())
    test_api_suggestions_endpoint()
    test_api_process_command_endpoint()
    print("[+] ALL VOICE ASSISTANT UNIT TESTS PASSED SUCCESSFULLY! (8/8)")
