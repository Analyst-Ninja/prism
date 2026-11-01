from fastapi import FastAPI

from customer_api.errors import register_handlers
from customer_api.routers import accounts, customers, transactions

app = FastAPI(title="Prism360 Customer API")
register_handlers(app)
app.include_router(customers.router)
app.include_router(accounts.router)
app.include_router(transactions.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
