from backend.app.core.config import settings
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine


# Construct async connection URL if not provided directly
def get_db_url() -> str:
    if settings.DATABASE_URL.startswith("postgresql://"):
        return settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
    return settings.DATABASE_URL


db_url = get_db_url()

# SQLite requires different arguments than PostgreSQL
connect_args = {"check_same_thread": False} if "sqlite" in db_url else {}

engine = create_async_engine(db_url, echo=settings.DEBUG, future=True, connect_args=connect_args)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
