"""DEV ONLY: stand-in for the Flink job. Writes Faker-built Customer 360 documents to Redis.

The real system never does this: only the Flink pipeline writes Redis (see CLAUDE.md).
Uses FAKE_CUSTOMERS / FAKE_SEED from the environment so the fake lakehouse matches.

Usage: uv run python utils/seed_redis_360.py [--flush]
"""

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "app" / "backend"))

from admin_api.settings import settings
from admin_api.stores.redis_store import KEY_PREFIX, make_client
from admin_api.stores.sample_data import build_dataset


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--flush", action="store_true", help="delete existing customer:* keys first")
    args = p.parse_args()
    r = make_client(settings.redis_url, settings.redis_timeout_seconds)
    if args.flush:
        for key in r.scan_iter(match=f"{KEY_PREFIX}*"):
            r.delete(key)
    data = build_dataset(settings.fake_customers, settings.fake_seed)
    pipe = r.pipeline()
    for doc in data.docs:
        pipe.set(f"{KEY_PREFIX}{doc['profile']['customer_id']}", json.dumps(doc))
    pipe.execute()
    print(f"wrote {len(data.docs)} customer 360 docs to {settings.redis_url}")


if __name__ == "__main__":
    main()
