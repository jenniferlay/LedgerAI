from datetime import date, datetime
from decimal import Decimal
from sqlalchemy import (
  BigInteger,
  Boolean,
  Date,
  DateTime,
  ForeignKey,
  Numeric,
  String,
  Text,
  UniqueConstraint,
  func,
  select,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.category.models import Category
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
  sync_started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
  requires_reauth: Mapped[bool] = mapped_column(
    Boolean, nullable=False, default=False, server_default="false"
  )
  created_at: Mapped[datetime] = mapped_column(
    DateTime(timezone=True), nullable=False, server_default=func.now()
  )


class PlaidTransaction(Base):
  __tablename__ = "plaid_transactions"
  __table_args__ = (
    UniqueConstraint(
      "plaid_item_id",
      "transaction_id",
      name="uq_plaid_transactions_item_transaction",
    ),
  )

  id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
  plaid_item_id: Mapped[int] = mapped_column(
    BigInteger, ForeignKey("plaid_items.id", ondelete="CASCADE"), nullable=False
  )
  transaction_id: Mapped[str] = mapped_column(String(255), nullable=False)
  account_id: Mapped[str] = mapped_column(String(255), nullable=False)
  pending_transaction_id: Mapped[str | None] = mapped_column(String(255))
  amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
  transaction_date: Mapped[date] = mapped_column(Date, nullable=False)
  authorized_date: Mapped[date | None] = mapped_column(Date)
  name: Mapped[str] = mapped_column(Text, nullable=False)
  merchant_name: Mapped[str | None] = mapped_column(String(255))
  pending: Mapped[bool] = mapped_column(Boolean, nullable=False)
  iso_currency_code: Mapped[str | None] = mapped_column(String(3))
  unofficial_currency_code: Mapped[str | None] = mapped_column(String(10))
  plaid_category_detailed: Mapped[str | None] = mapped_column(String(100))
  user_merchant: Mapped[str | None] = mapped_column(String(255))
  user_note: Mapped[str | None] = mapped_column(Text)
  hidden: Mapped[bool] = mapped_column(
    Boolean, nullable=False, server_default="false"
  )
  updated_at: Mapped[datetime] = mapped_column(
    DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
  )
  categoryid: Mapped[int | None] = mapped_column(BigInteger)
  category_userid: Mapped[int | None] = mapped_column(BigInteger)


def plaid_effective_categoryid():
  mapped = (
    select(Category.categoryid)
    .where(Category.plaid_code == PlaidTransaction.plaid_category_detailed)
    .scalar_subquery()
  )
  return func.coalesce(PlaidTransaction.categoryid, mapped)
