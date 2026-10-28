import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import api_v1_router
from app.services.runtime_sync_service import run_periodic_runtime_worker


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Tự động đồng bộ cấu trúc bảng (User, Role, UserOTP...) vào cơ sở dữ liệu
    from app.database import engine, Base
    import app.models  # noqa: F401
    try:
        from sqlalchemy import text
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            try:
                await conn.execute(text("""
                    ALTER TABLE notifications 
                    ADD COLUMN IF NOT EXISTS alert_id UUID,
                    ADD COLUMN IF NOT EXISTS incident_id UUID,
                    ADD COLUMN IF NOT EXISTS severity VARCHAR(20) DEFAULT 'INFO',
                    ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
                    ADD COLUMN IF NOT EXISTS target_url VARCHAR(255)
                """))
                await conn.execute(text("""
                    ALTER TABLE notifications ALTER COLUMN user_id DROP NOT NULL
                """))
            except Exception as schema_err:
                print(f"[Schema Notice] {schema_err}")
    except Exception as e:
        print(f"[Database Error] {e}")

    # Khởi động tiến trình background runtime đồng bộ số liệu IoT và cảnh báo
    worker_task = asyncio.create_task(run_periodic_runtime_worker())
    yield
    worker_task.cancel()
    try:
        await worker_task
    except asyncio.CancelledError:
        pass


app = FastAPI(title="EcoReport API", version="1.0.0", lifespan=lifespan)

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_v1_router, prefix="/api/v1")


@app.get("/health")
async def health_check():
    return {"status": "ok"}


