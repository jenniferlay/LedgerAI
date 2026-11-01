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
from sqlalchemy.orm import Mapped, mapped_column, relationship

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

  accounts: Mapped[list["PlaidAccount"]] = relationship(
    "PlaidAccount", back_populates="item", cascade="all, delete-orphan"
  )
  transactions: Mapped[list["PlaidTransaction"]] = relationship(
    "PlaidTransaction", back_populates="item", cascade="all, delete-orphan"
  )


class PlaidAccount(Base):
  __tablename__ = "plaid_accounts"

  id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
  plaid_item_id: Mapped[int] = mapped_column(
    BigInteger, ForeignKey("plaid_items.id", ondelete="CASCADE"), nullable=False
  )
  account_id: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
  name: Mapped[str] = mapped_column(String(255), nullable=False)
  official_name: Mapped[str | None] = mapped_column(String(255))
  type: Mapped[str] = mapped_column(String(50), nullable=False)  # depository, credit, loan, investment, other
  subtype: Mapped[str | None] = mapped_column(String(50))        # checking, savings, credit card, etc.
  mask: Mapped[str | None] = mapped_column(String(10))
  current_balance: Mapped[Decimal | None] = mapped_column(Numeric(14, 2))
  available_balance: Mapped[Decimal | None] = mapped_column(Numeric(14, 2))
  credit_limit: Mapped[Decimal | None] = mapped_column(Numeric(14, 2))
  iso_currency_code: Mapped[str | None] = mapped_column(String(3))
  unofficial_currency_code: Mapped[str | None] = mapped_column(String(10))
  is_active: Mapped[bool] = mapped_column(
    Boolean, nullable=False, default=True, server_default="true"
  )
  created_at: Mapped[datetime] = mapped_column(
    DateTime(timezone=True), nullable=False, server_default=func.now()
  )
  updated_at: Mapped[datetime] = mapped_column(
    DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
  )

  item: Mapped["PlaidItem"] = relationship("PlaidItem", back_populates="accounts")
  transactions: Mapped[list["PlaidTransaction"]] = relationship(
    "PlaidTransaction",
    back_populates="account",
    primaryjoin="foreign(PlaidTransaction.account_id) == PlaidAccount.account_id",
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
  is_transfer: Mapped[bool] = mapped_column(
    Boolean, nullable=False, server_default="false"
  )
  hidden: Mapped[bool] = mapped_column(
    Boolean, nullable=False, server_default="false"
  )
  updated_at: Mapped[datetime] = mapped_column(
    DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
  )
  categoryid: Mapped[int | None] = mapped_column(BigInteger)
  category_userid: Mapped[int | None] = mapped_column(BigInteger)

  item: Mapped["PlaidItem"] = relationship("PlaidItem", back_populates="transactions")
  account: Mapped["PlaidAccount | None"] = relationship(
    "PlaidAccount",
    back_populates="transactions",
    primaryjoin="foreign(PlaidTransaction.account_id) == PlaidAccount.account_id",
  )


def plaid_effective_categoryid():
  mapped = (
    select(Category.categoryid)
    .where(Category.plaid_code == PlaidTransaction.plaid_category_detailed)
    .scalar_subquery()
  )
  return func.coalesce(PlaidTransaction.categoryid, mapped)
