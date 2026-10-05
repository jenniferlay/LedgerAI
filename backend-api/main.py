import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from app.auth.routes import router as auth_router
from app.expenses.routes import router as expenses_router

logger = logging.getLogger(__name__)

app = FastAPI(
  title="My FastAPI Service",
  version="1.0.0"
)

app.include_router(auth_router)
app.include_router(expenses_router)


@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    logger.exception("Database error for %s", request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Database error"},
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception for %s", request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


@app.get("/")
async def ping():
  return {"status": "ok", "message": "pinged"}