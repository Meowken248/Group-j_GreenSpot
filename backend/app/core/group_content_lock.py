from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def lock_group_content(db: AsyncSession) -> None:
    # Group disband touches both groups and posts. Serialize these mutations
    # before either row lock, including moves/shares between two groups.
    await db.execute(text("SELECT pg_advisory_xact_lock(161113)"))
