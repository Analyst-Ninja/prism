from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from common.settings import settings
from customer_api.errors import register_handlers
from customer_api.routers import accounts, customers, transactions

app = FastAPI(title="Prism360 Customer API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_methods=["*"],
    allow_headers=["*"],
)
register_handlers(app)
app.include_router(customers.router)
app.include_router(accounts.router)
app.include_router(transactions.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
