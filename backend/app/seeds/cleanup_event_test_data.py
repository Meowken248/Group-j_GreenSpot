"""
Script dọn dẹp dữ liệu rác do bộ unit test Chức năng 21 ghi trực tiếp vào CSDL dev.

Bối cảnh: phiên bản đầu của ``backend/tests/test_events.py`` tạo User/Event thật trong
database dev và không dọn dẹp, dẫn tới:
- 48 tài khoản ``test_*@greenspot.vn`` bị gán nhầm role ADMIN (role_id=1).
- 21 sự kiện "Sự kiện Test ..." hiển thị công khai trên màn hình danh sách.

Cách dùng::

    python -m app.seeds.cleanup_event_test_data            # Chỉ xem trước (dry-run)
    python -m app.seeds.cleanup_event_test_data --apply    # Thực thi xoá & tính lại số đếm

Script an toàn khi chạy nhiều lần (idempotent).
"""

import asyncio
import sys

from sqlalchemy import delete, func, select, text

from app.database import AsyncSessionLocal
from app.models.event import Event, EventInterest, EventParticipant
from app.models.rbac import User

TEST_EMAIL_PATTERN = "test\\_%@greenspot.vn"


async def _collect_targets(session):
    users = (
        await session.execute(
            select(User).where(User.email.ilike(TEST_EMAIL_PATTERN, escape="\\"))
        )
    ).scalars().all()
    user_ids = [u.user_id for u in users]

    events = []
    if user_ids:
        events = (
            await session.execute(select(Event).where(Event.creator_id.in_(user_ids)))
        ).scalars().all()
    return users, events


async def _recount(session):
    """Tính lại current_participants / interested_count theo dữ liệu thật."""
    await session.execute(
        text(
            """
            UPDATE events e
            SET current_participants = COALESCE(p.cnt, 0),
                interested_count = COALESCE(i.cnt, 0)
            FROM events e2
            LEFT JOIN (
                SELECT event_id, COUNT(*) AS cnt FROM event_participants GROUP BY event_id
            ) p ON p.event_id = e2.event_id
            LEFT JOIN (
                SELECT event_id, COUNT(*) AS cnt FROM event_interests GROUP BY event_id
            ) i ON i.event_id = e2.event_id
            WHERE e.event_id = e2.event_id
            """
        )
    )


async def cleanup_test_data(apply: bool = False) -> None:
    async with AsyncSessionLocal() as session:
        users, events = await _collect_targets(session)

        print("=" * 64)
        print("🧹 [Cleanup Feature 21] Dữ liệu test phát hiện trong CSDL dev")
        print("=" * 64)
        print(f"- Tài khoản test_*@greenspot.vn : {len(users)}")
        print(f"- Sự kiện do các tài khoản này tạo: {len(events)}")
        for ev in events[:10]:
            print(f"    • {ev.status:<9} | {ev.title[:60]}")
        if len(events) > 10:
            print(f"    • ... và {len(events) - 10} sự kiện khác")

        if not apply:
            print("\nℹ️  Chế độ dry-run. Thêm tham số --apply để thực thi.")
            return

        if users:
            user_ids = [u.user_id for u in users]
            event_ids = [e.event_id for e in events]

            # Xoá tường minh các bảng con để không phụ thuộc ON DELETE CASCADE của DB.
            if event_ids:
                await session.execute(
                    delete(EventParticipant).where(EventParticipant.event_id.in_(event_ids))
                )
                await session.execute(
                    delete(EventInterest).where(EventInterest.event_id.in_(event_ids))
                )
            await session.execute(
                delete(EventParticipant).where(EventParticipant.user_id.in_(user_ids))
            )
            await session.execute(
                delete(EventInterest).where(EventInterest.user_id.in_(user_ids))
            )
            if event_ids:
                await session.execute(delete(Event).where(Event.event_id.in_(event_ids)))
            await session.execute(delete(User).where(User.user_id.in_(user_ids)))

        await _recount(session)
        await session.commit()

        remaining_users = (await session.execute(select(func.count()).select_from(User))).scalar_one()
        remaining_events = (
            await session.execute(select(func.count()).select_from(Event))
        ).scalar_one()
        print("\n✅ Đã dọn dẹp xong.")
        print(f"   Người dùng còn lại: {remaining_users} | Sự kiện còn lại: {remaining_events}")
        print("=" * 64)


if __name__ == "__main__":
    asyncio.run(cleanup_test_data(apply="--apply" in sys.argv))
