import uuid
from datetime import datetime, timezone


def get_mock_user_a_id() -> uuid.UUID:
    return uuid.UUID("11111111-1111-4111-a111-111111111111")


def get_mock_user_b_id() -> uuid.UUID:
    return uuid.UUID("22222222-2222-4222-a222-222222222222")


def create_valid_offline_payload(
    client_submission_id: str | None = None,
    idempotency_key: str | None = None,
    category_id: int = 1,
    title: str = "Rác thải bừa bãi tại công viên Hoàng Văn Thụ",
    description: str = "Tập kết bao rác sinh hoạt gây ô nhiễm mùi hôi nghiêm trọng cần dọn dẹp.",
    latitude: float = 10.7981234,
    longitude: float = 106.6612345,
    address_text: str = "Công viên Hoàng Văn Thụ, Phường 2, Tân Bình, TP.HCM",
    with_media: bool = True,
) -> dict:
    cid = client_submission_id or f"client_sub_{uuid.uuid4().hex[:16]}"
    ikey = idempotency_key or f"idemp_{uuid.uuid4().hex[:16]}"
    media_list = []
    if with_media:
        media_list = [
            {
                "client_file_id": f"file_img_{uuid.uuid4().hex[:8]}",
                "file_url": "https://storage.greenspot.vn/test-evidence.jpg",
                "thumbnail_url": "https://storage.greenspot.vn/test-evidence-thumb.jpg",
                "media_type": "IMAGE",
                "file_size_bytes": 1024 * 512,
                "mime_type": "image/jpeg",
                "file_hash": "sha256_mock_hash_image_123",
                "captured_at": datetime.now(timezone.utc).isoformat(),
            },
            {
                "client_file_id": f"file_audio_{uuid.uuid4().hex[:8]}",
                "file_url": "https://storage.greenspot.vn/test-voice.webm",
                "thumbnail_url": None,
                "media_type": "AUDIO",
                "file_size_bytes": 1024 * 128,
                "mime_type": "audio/webm",
                "file_hash": "sha256_mock_hash_audio_456",
                "captured_at": datetime.now(timezone.utc).isoformat(),
            },
        ]

    return {
        "client_submission_id": cid,
        "idempotency_key": ikey,
        "category_id": category_id,
        "title": title,
        "description": description,
        "severity": "HIGH",
        "latitude": latitude,
        "longitude": longitude,
        "address_text": address_text,
        "media": media_list,
        "is_anonymous": False,
        "reporter_phone": "0901234567",
        "client_timestamp": datetime.now(timezone.utc).isoformat(),
    }


def create_queue_batch(count: int, prefix: str = "batch_item") -> list[dict]:
    """Tạo danh sách payload hàng đợi (tối đa 20 mục theo R09)."""
    return [
        create_valid_offline_payload(
            client_submission_id=f"{prefix}_{i}_{uuid.uuid4().hex[:8]}",
            idempotency_key=f"key_{prefix}_{i}_{uuid.uuid4().hex[:8]}",
            title=f"Sự cố phản ánh ngoại tuyến số {i + 1}",
        )
        for i in range(count)
    ]
