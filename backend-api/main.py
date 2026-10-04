from fastapi import FastAPI

from app.auth.routes import router as auth_router

app = FastAPI(
  title="My FastAPI Service",
  version="1.0.0"
)

app.include_router(auth_router)


@app.get("/")
async def ping():
  return {"status": "ok", "message": "pinged"}