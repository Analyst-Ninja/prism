from functools import lru_cache
from typing import Annotated

from fastapi import Depends

from admin_api.settings import settings
from admin_api.stores.fake_lakehouse import FakeLakehouse
from admin_api.stores.lakehouse import LakehouseReader
from admin_api.stores.redis_store import Customer360Store, make_client
from admin_api.stores.sample_data import build_dataset


@lru_cache
def get_store() -> Customer360Store:
    return Customer360Store(make_client(settings.redis_url, settings.redis_timeout_seconds))


@lru_cache
def get_lakehouse() -> LakehouseReader:
    if settings.lakehouse_backend == "fake":
        return FakeLakehouse(build_dataset(settings.fake_customers, settings.fake_seed))
    raise NotImplementedError("Iceberg lakehouse reader arrives with plan step 4")


Store360 = Annotated[Customer360Store, Depends(get_store)]
Lakehouse = Annotated[LakehouseReader, Depends(get_lakehouse)]
