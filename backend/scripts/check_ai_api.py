import asyncio
import os
import sys
import time
from pathlib import Path

# Add project root to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

import httpx
from dotenv import dotenv_values

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")


def main():
    env_path = backend_dir / ".env"
    print(f"Loading env from: {env_path}")
    env_vars = dotenv_values(env_path)

    api_url = env_vars.get("KIRA_API_URL", "https://kiraai.vn/api/v1/chat/completions")
    api_key = env_vars.get("KIRA_API_KEY", "")
    model = env_vars.get("KIRA_MODEL", "kira-mini-1.0")
    timeout = float(env_vars.get("KIRA_TIMEOUT_SECONDS", "45.0"))

    masked_key = f"{api_key[:6]}...{api_key[-4:]}" if len(api_key) > 10 else "(empty)"
    print(f"1. Cấu hình kiểm tra:")
    print(f"   - API URL: {api_url}")
    print(f"   - Model: {model}")
    print(f"   - API Key: {masked_key}")
    print(f"   - Timeout: {timeout}s\n")

    if not api_key:
        print("[FAIL] KIRA_API_KEY chưa được thiết lập trong file .env!")
        return

    print("2. Đang gửi request kiểm tra trực tiếp tới API Kira AI...")
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": "Bạn là trợ lý AI thông minh."
            },
            {
                "role": "user",
                "content": "Chào bạn, hãy kiểm tra kết nối và trả lời ngắn gọn: 'Kira AI đang hoạt động bình thường'."
            }
        ],
        "temperature": 0.3
    }

    start_time = time.time()
    try:
        with httpx.Client(timeout=timeout) as client:
            resp = client.post(api_url, headers=headers, json=payload)
            elapsed = time.time() - start_time
            print(f"   - Mã phản hồi HTTP (Status Code): {resp.status_code}")
            print(f"   - Thời gian phản hồi (Latency): {elapsed:.2f} giây")

            if resp.status_code == 200:
                data = resp.json()
                print("   - [THÀNH CÔNG] API trả về mã 200 OK!")
                choices = data.get("choices", [])
                if choices:
                    content = choices[0].get("message", {}).get("content", "")
                    print(f"\n3. Phản hồi thực tế từ AI model ({model}):\n\"\"\"\n{content.strip()}\n\"\"\"")
                else:
                    print(f"   - Không có trường 'choices' trong response: {data}")
            else:
                print(f"   - [THẤT BẠI] API trả về mã lỗi {resp.status_code}")
                print(f"   - Chi tiết: {resp.text}")
    except httpx.ConnectError as e:
        print(f"   - [LỖI KẾT NỐI] Không thể kết nối tới server {api_url}: {e}")
    except httpx.TimeoutException:
        print(f"   - [TIMEOUT] Yêu cầu bị quá thời gian ({timeout}s)")
    except Exception as e:
        print(f"   - [LỖI KHÁC] {type(e).__name__}: {e}")

    print("\n4. Kiểm tra qua hàm nội bộ `call_kira_ai` của dự án:")
    from app.services.triage.triage_ai_service import call_kira_ai
    
    # Set os.environ so settings/os.getenv can pick it up if not loaded
    os.environ["KIRA_API_URL"] = api_url
    os.environ["KIRA_API_KEY"] = api_key
    os.environ["KIRA_MODEL"] = model

    test_msg = [
        {"role": "system", "content": "Bạn là chuyên gia phân loại sự cố môi trường."},
        {"role": "user", "content": "Tóm tắt ngắn gọn sự cố: Bãi rác tự phát bốc mùi hôi thối tại ngõ 123 đường Giải Phóng gây ô nhiễm môi trường và cản trở giao thông."}
    ]

    result = asyncio.run(call_kira_ai(test_msg, timeout=30.0))
    if result:
        print(f"   - [THÀNH CÔNG] `call_kira_ai` hoạt động tốt. Kết quả tóm tắt:\n   \"{result}\"")
    else:
        print("   - [THẤT BẠI] `call_kira_ai` trả về None!")

if __name__ == "__main__":
    main()
