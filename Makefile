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
