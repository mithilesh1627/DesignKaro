import logging

import redis.asyncio as aioredis
from backend.app.core.config import settings

logger = logging.getLogger("designkaro.redis")


class RedisManager:
    def __init__(self, url: str):
        self.url = url
        self._client: aioredis.Redis | None = None

    async def get_client(self) -> aioredis.Redis:
        if self._client is None:
            self._client = aioredis.from_url(self.url, encoding="utf-8", decode_responses=True, socket_timeout=2.0)
        return self._client

    async def check_health(self) -> bool:
        try:
            client = await self.get_client()
            return await client.ping()
        except Exception as e:
            logger.warning(f"Redis ping failed: {e}")
            return False

    async def close(self):
        if self._client:
            await self._client.close()
            self._client = None


redis_manager = RedisManager(settings.REDIS_URL)
