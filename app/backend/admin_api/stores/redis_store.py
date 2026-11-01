import json

import redis

KEY_PREFIX = "customer:"


def make_client(url: str, timeout: float) -> redis.Redis:
    return redis.Redis.from_url(url, socket_connect_timeout=timeout, socket_timeout=timeout, decode_responses=True)


class Customer360Store:
    """Read-only view over the 360 documents Flink writes to Redis. Raises redis.RedisError when Redis is down."""

    def __init__(self, client: redis.Redis) -> None:
        self._r = client

    def get(self, customer_id: str) -> dict | None:
        raw = self._r.get(f"{KEY_PREFIX}{customer_id}")
        return json.loads(raw) if raw else None

    def key_count(self) -> int:
        return sum(1 for _ in self._r.scan_iter(match=f"{KEY_PREFIX}*", count=500))

    def ping(self) -> bool:
        try:
            return bool(self._r.ping())
        except redis.RedisError:
            return False
