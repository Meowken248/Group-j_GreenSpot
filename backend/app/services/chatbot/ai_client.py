"""
Client kết nối mô hình ngôn ngữ lớn Kira AI (OpenAI Chat Completions Compatible)
Chức năng 24: AI chat box
Xử lý kết nối mạng, quản lý timeout 30 giây theo SRS (trang 196) và xử lý lỗi mềm (graceful degradation).
"""

import logging
import os
from typing import Dict, List, Optional
import httpx

from app.core.config import settings

logger = logging.getLogger("chatbot_ai_client")


SYSTEM_PROMPT = """Bạn là Trợ lý AI Sinh thái và Môi trường chính thức của nền tảng GreenSpot (Việt Nam).
Nhiệm vụ của bạn là đồng hành, giải đáp và hướng dẫn công dân trong việc xây dựng lối sống xanh, phân loại rác và chấp hành luật bảo vệ môi trường.

QUY TẮC RÀNG BUỘC CHUYÊN MÔN (GUARDRAILS):
1. Phạm vi hỗ trợ:
   - Hướng dẫn phân loại chất thải sinh hoạt, rác hữu cơ, rác tái chế, rác nguy hại (pin cũ, bóng đèn, hóa chất), rác cồng kềnh.
   - Tra cứu chế tài và mức phạt vi phạm hành chính về môi trường theo Nghị định 45/2022/NĐ-CP.
   - Hướng dẫn tìm kiếm trạm tái chế & điểm thu gom rác trên địa bàn TP.HCM.
   - Giải thích cơ chế tích lũy Điểm Xanh, cấp bậc Công dân Xanh và cách đổi quà tặng.
   - Hướng dẫn sử dụng các tính năng trên GreenSpot: Gửi báo cáo ô nhiễm GPS, bản đồ nhiệt AQI, tìm đường tránh ngập, cứu hộ Flood SOS, tham gia nhóm cộng đồng...
2. Xử lý câu hỏi ngoài phạm vi:
   - Nếu người dùng hỏi chủ đề KHÔNG LIÊN QUAN (làm thơ, code lập trình ngoài lề, giải toán, chính trị, đời tư cá nhân...): Bạn BẮT BUỘC từ chối nhã nhặn bằng câu:
     "Tôi chỉ hỗ trợ các vấn đề về môi trường và hệ thống Xanh. Bạn thử hỏi về phân loại rác nhé"
3. Định dạng câu trả lời:
   - Trình bày lịch sự, súc tích, rõ ràng theo các gạch đầu dòng hoặc các bước đánh số để người dân dễ thực hiện ngoài thực địa.
   - Với các câu trả lời liên quan đến quy định pháp luật và mức phạt, luôn đính kèm dòng kết luận:
     "*Câu trả lời của AI mang tính tham khảo, không thay thế văn bản pháp luật chính thức.*"
"""


async def call_kira_ai(
    messages: List[Dict[str, str]],
    timeout: Optional[float] = None,
) -> Optional[str]:
    """
    Gửi prompt đến Kira AI API.
    Timeout lấy từ cấu hình KIRA_TIMEOUT_SECONDS (mặc định 30.0 giây theo đặc tả SRS trang 196),
    có thể ghi đè bằng tham số `timeout`.
    Trả về: Nội dung văn bản câu trả lời, hoặc None nếu có lỗi (để kích hoạt Fallback Engine).
    """
    api_key = settings.KIRA_API_KEY or os.getenv("KIRA_API_KEY", "")
    api_url = settings.KIRA_API_URL or os.getenv("KIRA_API_URL", "https://kiraai.vn/api/v1/chat/completions")
    model_name = settings.KIRA_MODEL or os.getenv("KIRA_MODEL", "kira-mini-1.0")
    req_timeout = timeout or settings.KIRA_TIMEOUT_SECONDS or 30.0

    if not api_key:
        logger.warning("[KiraAI] Chưa cấu hình KIRA_API_KEY. Chuyển sang Fallback Engine.")
        return None

    # Chuẩn bị danh sách messages bao gồm System Prompt ở đầu
    payload_messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    payload_messages.extend(messages)

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
                    "messages": payload_messages,
                    "temperature": 0.4,
                    # Kira AI (kira-mini-1.0) tiêu hao phần lớn hạn mức token cho "suy luận ẩn"
                    # trước khi sinh nội dung: với max_tokens=1024 phản hồi trả về rỗng kèm
                    # finish_reason="length" (đo thực tế ~3.100 completion_tokens cho một câu
                    # trả lời ~1.000 ký tự). Đặt 8192 để câu trả lời luôn có nội dung trong
                    # giới hạn 30 giây của SRS (đo thực tế ~10 giây/câu).
                    "max_tokens": 8192,
                },
            )

            if resp.status_code == 200:
                data = resp.json()
                choices = data.get("choices", [])
                if choices:
                    content = choices[0].get("message", {}).get("content", "")
                    if content and len(content.strip()) > 0:
                        return content.strip()
                    logger.warning(
                        "[KiraAI] Phản hồi 200 nhưng không có nội dung "
                        f"(finish_reason={choices[0].get('finish_reason')}). Chuyển sang Fallback Engine."
                    )
                else:
                    logger.warning("[KiraAI] Phản hồi 200 nhưng không có choices. Chuyển sang Fallback Engine.")
            elif resp.status_code == 402:
                logger.info("[KiraAI] Tài khoản Kira AI hết hạn mức số dư (402). Tự động kích hoạt Fallback Engine.")
            else:
                logger.warning(f"[KiraAI] API phản hồi mã {resp.status_code}: {resp.text[:200]}")
    except httpx.TimeoutException:
        logger.warning(f"[KiraAI] Quá thời gian phản hồi {req_timeout}s.")
    except Exception as e:
        logger.warning(f"[KiraAI] Lỗi kết nối ngoại lệ: {e}")

    return None

