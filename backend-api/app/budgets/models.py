from datetime import datetime
from decimal import Decimal

from sqlalchemy import BigInteger, DateTime, Numeric, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Budget(Base):
	__tablename__ = "budgets"

	budgetid: Mapped[int] = mapped_column(BigInteger, primary_key=True)
	userid: Mapped[int] = mapped_column(BigInteger)
	categoryid: Mapped[int] = mapped_column(BigInteger)
	category_userid: Mapped[int] = mapped_column(BigInteger)
	amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
	created_at: Mapped[datetime] = mapped_column(
		DateTime(timezone=True), server_default=func.now()
	)
	updated_at: Mapped[datetime] = mapped_column(
		DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
	)