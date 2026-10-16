"""
Test Script kiểm tra WebSocket Real-time Engine cho Chức năng 15
"""

import asyncio
import json
import requests
import websockets

BASE_URL = "http://127.0.0.1:8000/api/v1"
WS_URL = "ws://127.0.0.1:8000/api/v1/chat/ws"


async def test_websocket():
    print("=" * 60)
    print("⚡ [TEST WEBSOCKET] Bắt đầu kiểm tra kết nối WebSocket thời gian thực...")
    print("=" * 60)

    # 1. Đăng nhập lấy access_token
    login_res = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": "citizen@ecoreport.gov.vn", "password": "Password123@"}
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]

    # Lấy phòng quận để test gửi tin
    dist_res = requests.get(f"{BASE_URL}/chat/conversations?tab=district", headers={"Authorization": f"Bearer {token}"})
    assert dist_res.status_code == 200
    conv_id = dist_res.json()["items"][0]["conversation_id"]

    # 2. Kết nối WebSocket
    uri = f"{WS_URL}?token={token}"
    print(f"Connecting to {uri}...")
    async with websockets.connect(uri) as ws:
        # Nhận tin nhắn chào mừng CONNECTED
        welcome_raw = await asyncio.wait_for(ws.recv(), timeout=5.0)
        welcome = json.loads(welcome_raw)
        print(f"✅ Nhận sự kiện chào mừng: {welcome}")
        assert welcome["event"] == "CONNECTED"

        # 3. Gửi PING -> mong đợi PONG
        await ws.send(json.dumps({"action": "PING"}))
        pong_raw = await asyncio.wait_for(ws.recv(), timeout=5.0)
        pong = json.loads(pong_raw)
        print(f"✅ Nhận phản hồi Heartbeat: {pong}")
        assert pong["event"] == "PONG"

        # 4. Gửi TYPING
        await ws.send(json.dumps({
            "action": "TYPING",
            "conversation_id": conv_id,
            "is_typing": True,
        }))
        print("✅ Đã gửi sự kiện TYPING (đang nhập tin nhắn)")

        # Chờ 3.5s để tránh rate limit quận từ test trước
        print("⏳ Đợi 3.5s trước khi gửi tin để tránh rate limit...")
        await asyncio.sleep(3.5)

        # 5. Gửi SEND_MESSAGE qua WebSocket
        msg_payload = {
            "action": "SEND_MESSAGE",
            "conversation_id": conv_id,
            "content": "Tin nhắn gửi trực tiếp qua WebSocket engine!",
        }
        await ws.send(json.dumps(msg_payload))
        sent_confirm_raw = await asyncio.wait_for(ws.recv(), timeout=5.0)
        sent_confirm = json.loads(sent_confirm_raw)
        print(f"✅ Xác nhận gửi tin qua WS: {sent_confirm}")
        assert sent_confirm["event"] == "MESSAGE_SENT"
        assert sent_confirm["message"]["content"] == "Tin nhắn gửi trực tiếp qua WebSocket engine!"

    print("\n🎉 WEBSOCKET ENGINE HOẠT ĐỘNG HOÀN HẢO THEO THỜI GIAN THỰC!")


if __name__ == "__main__":
    asyncio.run(test_websocket())
