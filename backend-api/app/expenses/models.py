from datetime import date

from decimal import Decimal

from sqlalchemy import BigInteger, Date, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Expense(Base):
	__tablename__ = "expenses"

	expenseid: Mapped[int] = mapped_column(BigInteger, primary_key=True)
	userid: Mapped[int] = mapped_column(BigInteger)
	categoryid: Mapped[int | None] = mapped_column(BigInteger)
	category_userid: Mapped[int | None] = mapped_column(BigInteger)
	amount: Mapped[Decimal] = mapped_column(Numeric(14, 2))
	note: Mapped[str] = mapped_column(Text)
	merchant: Mapped[str | None] = mapped_column(String(255))
	spent_on: Mapped[date] = mapped_column(Date)
