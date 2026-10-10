from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class PlaidItem(Base):
  __tablename__ = "plaid_items"

  id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
  user_id: Mapped[int] = mapped_column(
    BigInteger, ForeignKey("users.userid", ondelete="CASCADE"), nullable=False
  )
  item_id: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
  access_token: Mapped[str] = mapped_column(Text, nullable=False)
  cursor: Mapped[str | None] = mapped_column(Text)
  created_at: Mapped[datetime] = mapped_column(
    DateTime(timezone=True), nullable=False, server_default=func.now()
  )
