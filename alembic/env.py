from sqlalchemy import create_engine

from alembic import context
from common.settings import settings
from customer_api import models  # noqa: F401  (register tables)
from customer_api.db import Base

target_metadata = Base.metadata


def run_migrations_online() -> None:
    # Allow overriding the URL (tests / CI) via -x url=...
    url = context.get_x_argument(as_dictionary=True).get("url", settings.sqlalchemy_url)
    engine = create_engine(url)
    with engine.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


run_migrations_online()
