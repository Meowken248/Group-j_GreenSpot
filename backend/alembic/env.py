import asyncio
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

from app.core.config import settings
from app.database import Base
import app.models  

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

db_url = settings.DATABASE_URL
if db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
if "?schema=" in db_url:
    db_url = db_url.split("?schema=")[0]
config.set_main_option("sqlalchemy.url", db_url)


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )


    with context.begin_transaction():
        context.run_migrations()


import os


# Chỉ quản lý schema public; bỏ qua các schema hệ thống do PostGIS tạo (tiger, topology, ...)
ALLOWED_SCHEMAS = {None, "public"}
# Các bảng do extension PostGIS quản lý, Alembic không được autogenerate create/drop
IGNORED_TABLES = {"spatial_ref_sys"}


def include_object(object, name, type_, reflected, compare_to):
    filter_tables = os.getenv("ALEMBIC_FILTER_TABLES")
    if filter_tables and type_ == "table":
        return name in set(filter_tables.split(","))
    if type_ == "table" and name in IGNORED_TABLES:
        return False

    # Loại bỏ mọi object thuộc schema ngoài public (tiger, topology, ...)
    schema = getattr(object, "schema", None)
    table_schema = getattr(getattr(object, "table", None), "schema", None)
    if schema not in ALLOWED_SCHEMAS or table_schema not in ALLOWED_SCHEMAS:
        return False

    # Không tự động DROP bảng/index đang có trong CSDL nhưng không khai báo trong models
    # (PostGIS tạo sẵn tiger/topology trong search_path). Bật ALEMBIC_ALLOW_DROP_TABLES=1 nếu muốn drop.
    allow_drop = os.getenv("ALEMBIC_ALLOW_DROP_TABLES") == "1"
    if not allow_drop and compare_to is None:
        if type_ == "table" and name not in target_metadata.tables:
            return False
        if type_ == "index":
            owner = getattr(getattr(object, "table", None), "name", None)
            if owner not in target_metadata.tables:
                return False

    if type_ == "index" and name and name.startswith("idx_"):
        for c in getattr(object, "columns", []):
            if "geometry" in str(type(c.type)).lower():
                return False
    return True


def do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        include_object=include_object,
    )

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

