from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from admin_api.errors import register_handlers
from admin_api.routers import customers360, explore, ops, search
from admin_api.settings import settings

app = FastAPI(title="Prism360 Admin API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_methods=["*"],
    allow_headers=["*"],
)
register_handlers(app)
app.include_router(search.router)  # before customers360 so /customers/search is never read as an id
app.include_router(customers360.router)
app.include_router(explore.router)
app.include_router(ops.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
