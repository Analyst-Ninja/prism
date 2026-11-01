from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


class NotFound(Exception):
    pass


class ServiceUnavailable(Exception):
    pass


def register_handlers(app: FastAPI) -> None:
    @app.exception_handler(NotFound)
    async def _nf(_: Request, exc: NotFound) -> JSONResponse:
        return JSONResponse(status_code=404, content={"detail": str(exc)})

    @app.exception_handler(ServiceUnavailable)
    async def _su(_: Request, exc: ServiceUnavailable) -> JSONResponse:
        return JSONResponse(status_code=503, content={"detail": str(exc)})
