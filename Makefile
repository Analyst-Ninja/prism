COMPOSE = docker compose -f docker/docker-compose.yml

.PHONY: up-local down seed rebuild-redis verify-rebuild

up-local:
	mkdir -p data/warehouse
	$(COMPOSE) up -d

down:
	$(COMPOSE) down

seed:
	uv run python utils/seed_demo.py

rebuild-redis:
	uv run python utils/rebuild_redis.py

verify-rebuild:
	uv run python utils/verify_rebuild.py

.PHONY: api migrate test

api:
	uv run fastapi dev app/backend/customer_api/main.py

migrate:
	uv run alembic upgrade head

test:
	uv run pytest

.PHONY: admin-api seed-redis
admin-api:
	uv run fastapi dev app/backend/admin_api/main.py --port 8001

seed-redis:
	uv run python utils/seed_redis_360.py --flush

.PHONY: web-install web-customer web-admin web-build web-lint
web-install:
	cd app/frontend && pnpm install

web-customer:
	cd app/frontend && pnpm dev:customer

web-admin:
	cd app/frontend && pnpm dev:admin

web-build:
	cd app/frontend && pnpm build

web-lint:
	cd app/frontend && pnpm lint
