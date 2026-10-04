from fastapi import FastAPI

app = FastAPI(
    title="My FastAPI Service",
    version="1.0.0"
)

@app.get("/")
async def ping():
    return {"status": "ok", "message": "pinged"}