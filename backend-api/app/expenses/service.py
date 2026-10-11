from datetime import date
from typing import Any, Mapping

from sqlalchemy import (
	Boolean,
	BigInteger,
	Numeric,
	String,
	cast,
	func,
	literal,
	select,
	union_all,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app.expenses.models import Category, Expense
from app.expenses.schemas import ExpenseCreate
from app.plaid.models import PlaidItem, PlaidTransaction


def _escape_like_term(value: str) -> str:
	return value.strip().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


async def list_categories(db: AsyncSession, user_id: int) -> list[Category]:
	statement = (
		select(Category)
		.where(Category.userid.in_((0, user_id)))
		.order_by(Category.parent_categoryid, Category.name, Category.categoryid)
	)
	result = await db.scalars(statement)
	return list(result.all())


async def create_expense(
	db: AsyncSession, user_id: int, data: ExpenseCreate
) -> Expense:
	expense = Expense(userid=user_id, **data.model_dump())
	if data.categoryid is not None:
		expense.category_userid = (
			select(Category.userid)
			.where(Category.categoryid == data.categoryid)
			.scalar_subquery()
		)
	db.add(expense)
	await db.commit()
	await db.refresh(expense)
	return expense


async def list_expenses(
	db: AsyncSession,
	user_id: int,
	*,
	start_date: date | None = None,
	end_date: date | None = None,
	categoryid: int | None = None,
	merchant: str | None = None,
	limit: int = 100,
	offset: int = 0,
) -> list[Expense]:
	statement = select(Expense).where(Expense.userid == user_id)

	if start_date is not None:
		statement = statement.where(Expense.spent_on >= start_date)
	if end_date is not None:
		statement = statement.where(Expense.spent_on <= end_date)
	if categoryid is not None:
		statement = statement.where(Expense.categoryid == categoryid)
	if merchant is not None:
		escaped_merchant = _escape_like_term(merchant)
		statement = statement.where(
			Expense.merchant.ilike(f"%{escaped_merchant}%", escape="\\")
		)

	statement = (
		statement.order_by(Expense.spent_on.desc(), Expense.expenseid.desc())
		.limit(limit)
		.offset(offset)
	)
	result = await db.scalars(statement)
	return list(result.all())


async def list_expense_feed(
	db: AsyncSession,
	user_id: int,
	*,
	start_date: date | None = None,
	end_date: date | None = None,
	categoryid: int | None = None,
	merchant: str | None = None,
	limit: int = 100,
	offset: int = 0,
) -> list[Mapping[str, Any]]:
	manual_query = select(
		literal("manual").label("source"),
		Expense.expenseid.label("id"),
		(
			cast(
				Expense.amount_dollars * 100 + Expense.amount_cents,
				Numeric(14, 2),
			)
			/ 100
		).label("amount"),
		Expense.spent_on.label("spent_on"),
		Expense.merchant.label("merchant"),
		Expense.note.label("description"),
		cast(Expense.categoryid, BigInteger).label("categoryid"),
		literal(None, type_=String).label("transaction_id"),
		literal(None, type_=String).label("account_id"),
		literal(None, type_=Boolean).label("pending"),
		literal(None, type_=String).label("currency"),
	).where(Expense.userid == user_id)

	plaid_query = (
		select(
			literal("plaid").label("source"),
			PlaidTransaction.id.label("id"),
			PlaidTransaction.amount.label("amount"),
			PlaidTransaction.transaction_date.label("spent_on"),
			func.coalesce(
				PlaidTransaction.merchant_name,
				PlaidTransaction.name,
			).label("merchant"),
			PlaidTransaction.name.label("description"),
			literal(None, type_=BigInteger).label("categoryid"),
			PlaidTransaction.transaction_id.label("transaction_id"),
			PlaidTransaction.account_id.label("account_id"),
			PlaidTransaction.pending.label("pending"),
			func.coalesce(
				PlaidTransaction.iso_currency_code,
				PlaidTransaction.unofficial_currency_code,
			).label("currency"),
		)
		.join(PlaidItem, PlaidTransaction.plaid_item_id == PlaidItem.id)
		.where(PlaidItem.user_id == user_id)
	)

	if start_date is not None:
		manual_query = manual_query.where(Expense.spent_on >= start_date)
		plaid_query = plaid_query.where(PlaidTransaction.transaction_date >= start_date)
	if end_date is not None:
		manual_query = manual_query.where(Expense.spent_on <= end_date)
		plaid_query = plaid_query.where(PlaidTransaction.transaction_date <= end_date)
	if categoryid is not None:
		manual_query = manual_query.where(Expense.categoryid == categoryid)
		plaid_query = plaid_query.where(False)
	if merchant is not None:
		escaped_merchant = _escape_like_term(merchant)
		search_term = f"%{escaped_merchant}%"
		manual_query = manual_query.where(
			Expense.merchant.ilike(search_term, escape="\\")
		)
		plaid_query = plaid_query.where(
			func.coalesce(
				PlaidTransaction.merchant_name,
				PlaidTransaction.name,
			).ilike(search_term, escape="\\")
		)

	window = limit + offset
	manual_query = (
		manual_query.order_by(Expense.spent_on.desc(), Expense.expenseid.desc())
		.limit(window)
	)
	plaid_query = (
		plaid_query.order_by(
			PlaidTransaction.transaction_date.desc(), PlaidTransaction.id.desc()
		)
		.limit(window)
	)
	feed = union_all(manual_query, plaid_query).subquery()
	statement = (
		select(feed)
		.order_by(feed.c.spent_on.desc(), feed.c.source.asc(), feed.c.id.desc())
		.limit(limit)
		.offset(offset)
	)
	result = await db.execute(statement)
	return list(result.mappings().all())