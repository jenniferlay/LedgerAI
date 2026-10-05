from datetime import date

from sqlalchemy import BigInteger, Date, Integer, SmallInteger, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

class Category(Base):
	__tablename__ = "categories"

	categoryid: Mapped[int] = mapped_column(BigInteger, primary_key=True)
	userid: Mapped[int] = mapped_column(BigInteger)
	parent_categoryid: Mapped[int | None] = mapped_column(BigInteger)
	name: Mapped[str] = mapped_column(String(100))
	icon: Mapped[str | None] = mapped_column(String(50))

class Expense(Base):
	__tablename__ = "expenses"

	expenseid: Mapped[int] = mapped_column(BigInteger, primary_key=True)
	userid: Mapped[int] = mapped_column(BigInteger)
	categoryid: Mapped[int | None] = mapped_column(BigInteger)
	category_userid: Mapped[int | None] = mapped_column(BigInteger)
	amount_dollars: Mapped[int] = mapped_column(Integer)
	amount_cents: Mapped[int] = mapped_column(SmallInteger)
	note: Mapped[str] = mapped_column(Text)
	merchant: Mapped[str | None] = mapped_column(String(255))
	spent_on: Mapped[date] = mapped_column(Date)