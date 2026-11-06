import os
from typing import Literal

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, TypeAdapter
from pydantic_ai.messages import ModelRequest, ModelResponse, TextPart, UserPromptPart

from conversational_agent.agent import (
  add_current_financial_context,
  advisor_agent,
)
from conversational_agent.models import AgentDeps, CategoryRecord
from conversational_agent.tools import register_all_tools

load_dotenv()

app = FastAPI(title="LedgerAI Conversational Agent Service", version="1.0.0")

app.add_middleware(
  CORSMiddleware,
  allow_origins=["*"],
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)


class ChatHistoryItem(BaseModel):
  role: Literal["user", "assistant"]
  content: str


class ChatRequest(BaseModel):
  message: str
  history: list[ChatHistoryItem] = Field(default_factory=list)


class ChatAction(BaseModel):
  label: str
  action: Literal["navigate", "send"]
  target: str


class ChatResponse(BaseModel):
  response: str
  actions: list[ChatAction] = Field(default_factory=list)


@app.get("/health")
async def health_check():
  return {"status": "ok", "service": "conversational-agent"}


@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(
  body: ChatRequest,
  authorization: str | None = Header(default=None),
) -> ChatResponse:
  if not authorization or not authorization.startswith("Bearer "):
    raise HTTPException(status_code=401, detail="Bearer access token required in Authorization header")

  access_token = authorization.split("Bearer ", 1)[1].strip()
  api_base_url = os.getenv("API_BASE_URL", "http://127.0.0.1:8000").rstrip("/")

  # Retrieve user categories to build financial context
  categories: list[CategoryRecord] = []
  headers = {"Authorization": f"Bearer {access_token}"}
  try:
    async with httpx.AsyncClient(timeout=10.0) as client:
      resp = await client.get(f"{api_base_url}/categories", headers=headers)
      if resp.status_code == 404:
        resp = await client.get(f"{api_base_url}/expenses/categories", headers=headers)
      if resp.status_code == 200:
        categories = TypeAdapter(list[CategoryRecord]).validate_python(resp.json())
  except Exception:
    pass

  deps = AgentDeps(
    api_base_url=api_base_url,
    access_token=access_token,
    categories=categories,
  )

  # Convert history into Pydantic AI message structure
  message_history = []
  for h in body.history[-10:]:
    if h.role == "user":
      message_history.append(ModelRequest(parts=[UserPromptPart(content=h.content)]))
    elif h.role == "assistant":
      message_history.append(ModelResponse(parts=[TextPart(content=h.content)]))

  try:
    result = await advisor_agent.run(
      body.message,
      deps=deps,
      message_history=message_history if message_history else None,
    )
    return ChatResponse(response=str(result.data))
  except Exception as e:
    # If the primary model encounters a temporary 503 spike, fall back to gemini-3.1-flash-lite
    err_str = str(e)
    if "503" in err_str or "UNAVAILABLE" in err_str:
      try:
        from pydantic_ai import Agent

        fallback_agent = Agent(
          "google:gemini-3.1-flash-lite",
          deps_type=AgentDeps,
          system_prompt=advisor_agent._system_prompts[0] if advisor_agent._system_prompts else "",
        )
        fallback_agent.instructions(add_current_financial_context)
        register_all_tools(fallback_agent)

        fallback_result = await fallback_agent.run(
          body.message,
          deps=deps,
          message_history=message_history if message_history else None,
        )
        return ChatResponse(response=str(fallback_result.data))
      except Exception:
        pass
    raise HTTPException(status_code=500, detail=f"Agent error: {e}")
