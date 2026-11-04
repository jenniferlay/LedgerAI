from typing import Literal
from pydantic import BaseModel, Field


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
