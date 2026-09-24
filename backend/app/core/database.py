"""SQLAlchemy engine and session management.

Production targets Supabase Postgres. For local no-Docker runs it also
supports SQLite (set SUPABASE_DB_URL=sqlite:///./agrisphere_local.db);
tables are then auto-created on startup.
"""
import logging
import uuid
from collections.abc import Generator
from typing import Any

from sqlalchemy import CHAR, JSON, create_engine
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.types import TypeDecorator

from app.core.config import settings

logger = logging.getLogger("app.db")


class Base(DeclarativeBase):
    """Shared declarative base for all ORM models."""


class GUID(TypeDecorator):
    """Platform-independent GUID: PG UUID on Postgres, CHAR(36) elsewhere."""

    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(PG_UUID(as_uuid=True))
        return dialect.type_descriptor(CHAR(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        if dialect.name == "postgresql":
            return value
        if isinstance(value, uuid.UUID):
            return str(value)
        return str(uuid.UUID(str(value)))

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        if isinstance(value, uuid.UUID):
            return value
        return uuid.UUID(str(value))


class JSONType(TypeDecorator):
    """JSONB on Postgres, JSON elsewhere (tests/SQLite)."""

    impl = JSON
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(JSONB())
        return dialect.type_descriptor(JSON())


def _is_sqlite(url: str) -> bool:
    return url.startswith("sqlite")


_engine = None
_SessionLocal: sessionmaker | None = None


def get_engine():
    global _engine, _SessionLocal
    if _engine is None:
        url = settings.SUPABASE_DB_URL
        kwargs: dict[str, Any] = {"pool_pre_ping": True, "echo": False}
        if _is_sqlite(url):
            kwargs["connect_args"] = {"check_same_thread": False}
        else:
            kwargs.update(pool_size=5, max_overflow=10, pool_recycle=1800)
        _engine = create_engine(url, **kwargs)
        _SessionLocal = sessionmaker(bind=_engine, autoflush=False, expire_on_commit=False)
    return _engine


def get_session_factory() -> sessionmaker:
    get_engine()
    assert _SessionLocal is not None
    return _SessionLocal


def is_local_db() -> bool:
    """True when running on SQLite (no Docker / no Postgres)."""
    return _is_sqlite(settings.SUPABASE_DB_URL)


def init_db() -> None:
    """Ensure the schema exists at startup, whatever the database.

    SQLite: full local mode (create all + auto-migrate). Postgres: normally a
    no-op because schema.sql/alembic provisioned everything — but if the
    database is completely empty (first deploy, schema.sql not run yet),
    create the tables from the models so the app works immediately instead of
    500-ing on every request. Safe: create_all only creates MISSING tables and
    never alters existing ones.
    """
    if is_local_db():
        init_local_db()
        return

    import logging
    import sqlalchemy

    engine = get_engine()
    try:
        inspector = sqlalchemy.inspect(engine)
        tables = inspector.get_table_names()
    except Exception as e:
        logger.warning("Schema check failed (%s) — assuming provisioned", e)
        return
    if tables:
        return

    logger = logging.getLogger("app.db")
    logger.warning("Database is empty — creating schema from models (run schema.sql/alembic for the canonical DDL)")
    from app.models import (  # noqa: F401  (register mappers)
        Activity,
        AgentLog,
        ChatMessage,
        ChatSession,
        DiseaseReport,
        Farm,
        MarketPrediction,
        Notification,
        ProfitPrediction,
        Recommendation,
        User,
        WeatherRecord,
    )
    Base.metadata.create_all(bind=engine)
    logger.info("Created initial database schema")


def init_local_db() -> None:
    """Create all tables + auto-migrate for SQLite local runs."""
    import logging

    logger = logging.getLogger("app.db")
    engine = get_engine()
    from app.models import (  # noqa: F401  (register mappers)
        Activity,
        AgentLog,
        ChatMessage,
        ChatSession,
        DiseaseReport,
        Farm,
        MarketPrediction,
        Notification,
        ProfitPrediction,
        Recommendation,
        User,
        WeatherRecord,
    )

    Base.metadata.create_all(bind=engine)
    _auto_migrate_sqlite(engine, logger)
    logger.info("Local SQLite database initialized at %s", settings.SUPABASE_DB_URL)


def _auto_migrate_sqlite(engine, logger) -> None:
    """Add columns that exist on the models but not in an older SQLite file.

    SQLite's CREATE TABLE won't alter existing tables, so on schema changes we
    ALTER TABLE ADD COLUMN for any missing columns (safe + idempotent).
    """
    import sqlalchemy

    with engine.connect() as conn:
        inspector = sqlalchemy.inspect(engine)
        for table_name, table in Base.metadata.tables.items():
            if not inspector.has_table(table_name):
                continue
            existing = {c["name"] for c in inspector.get_columns(table_name)}
            for col in table.columns:
                if col.name in existing:
                    continue
                col_type = col.type.compile(engine.dialect)
                default = ""
                if col.server_default is not None and col.server_default.arg is not None:
                    default = f" DEFAULT '{col.server_default.arg}'"
                elif col.nullable is False:
                    default = " DEFAULT ''"
                conn.exec_driver_sql(
                    f'ALTER TABLE "{table_name}" ADD COLUMN "{col.name}" {col_type}{default}'
                )
                logger.info("Auto-migrated: added %s.%s", table_name, col.name)
        conn.commit()


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency yielding a DB session with rollback on error."""
    db = get_session_factory()()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
