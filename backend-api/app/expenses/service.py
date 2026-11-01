from datetime import date
from typing import Any, Mapping

from sqlalchemy import (
	BigInteger,
	String,
	Boolean,
	func,
	literal,
	select,
	cast,
	union_all,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app.expenses.models import Expense
from app.category.service import get_category_owner
from app.expenses.schemas import ExpenseCreate, ExpenseUpdate
from app.plaid.models import (
	PlaidAccount,
	PlaidItem,
	PlaidTransaction,
	plaid_effective_categoryid,
)


class CategoryNotFoundError(Exception):
	pass


class PlaidExpenseFieldsError(Exception):
	pass


def _escape_like_term(value: str) -> str:
	return value.strip().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


async def create_expense(
	db: AsyncSession, user_id: int, data: ExpenseCreate
) -> Expense:
	values = data.model_dump()
	if values["spent_on"] is None:
		values.pop("spent_on")
	expense = Expense(userid=user_id, **values)
	if data.categoryid is not None:
		owner = await get_category_owner(db, user_id, data.categoryid)
		if owner is None:
			raise CategoryNotFoundError
		expense.category_userid = owner
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
		Expense.amount.label("amount"),
		Expense.spent_on.label("spent_on"),
		Expense.merchant.label("merchant"),
		Expense.note.label("description"),
		cast(Expense.categoryid, BigInteger).label("categoryid"),
		literal(None, type_=String).label("transaction_id"),
		literal(None, type_=String).label("account_id"),
		literal(None, type_=Boolean).label("pending"),
		literal(None, type_=String).label("currency"),
		literal(False, type_=Boolean).label("is_transfer"),
		literal(None, type_=String).label("account_name"),
		literal(None, type_=String).label("account_mask"),
		literal(None, type_=String).label("account_type"),
		literal(None, type_=String).label("account_subtype"),
	).where(Expense.userid == user_id)

	plaid_query = (
		select(
			literal("plaid").label("source"),
			PlaidTransaction.id.label("id"),
			PlaidTransaction.amount.label("amount"),
			PlaidTransaction.transaction_date.label("spent_on"),
			func.coalesce(
				PlaidTransaction.user_merchant,
				PlaidTransaction.merchant_name,
				PlaidTransaction.name,
			).label("merchant"),
			func.coalesce(
				PlaidTransaction.user_note,
				PlaidTransaction.name,
			).label("description"),
			plaid_effective_categoryid().label("categoryid"),
			PlaidTransaction.transaction_id.label("transaction_id"),
			PlaidTransaction.account_id.label("account_id"),
			PlaidTransaction.pending.label("pending"),
			func.coalesce(
				PlaidTransaction.iso_currency_code,
				PlaidTransaction.unofficial_currency_code,
			).label("currency"),
			PlaidTransaction.is_transfer.label("is_transfer"),
			PlaidAccount.name.label("account_name"),
			PlaidAccount.mask.label("account_mask"),
			PlaidAccount.type.label("account_type"),
			PlaidAccount.subtype.label("account_subtype"),
		)
		.join(PlaidItem, PlaidTransaction.plaid_item_id == PlaidItem.id)
		.outerjoin(PlaidAccount, PlaidTransaction.account_id == PlaidAccount.account_id)
		.where(PlaidItem.user_id == user_id, PlaidTransaction.hidden.is_(False))
	)

	if start_date is not None:
		manual_query = manual_query.where(Expense.spent_on >= start_date)
		plaid_query = plaid_query.where(PlaidTransaction.transaction_date >= start_date)
	if end_date is not None:
		manual_query = manual_query.where(Expense.spent_on <= end_date)
		plaid_query = plaid_query.where(PlaidTransaction.transaction_date <= end_date)
	if categoryid is not None:
		manual_query = manual_query.where(Expense.categoryid == categoryid)
		plaid_query = plaid_query.where(
			plaid_effective_categoryid() == categoryid
		)
	if merchant is not None:
		escaped_merchant = _escape_like_term(merchant)
		search_term = f"%{escaped_merchant}%"
		manual_query = manual_query.where(
			Expense.merchant.ilike(search_term, escape="\\")
		)
		plaid_query = plaid_query.where(
			func.coalesce(
				PlaidTransaction.user_merchant,
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

async def update_expense_item(
	db: AsyncSession,
	user_id: int,
	source: str,
	item_id: int,
	data: ExpenseUpdate,
) -> dict[str, Any] | None:
	if source == "manual":
		expense = await db.get(Expense, item_id)
		if not expense or expense.userid != user_id:
			return None

		if data.amount is not None:
			expense.amount = data.amount
		if data.spent_on is not None:
			expense.spent_on = data.spent_on
		if data.merchant is not None:
			expense.merchant = data.merchant
		if data.categoryid is not None:
			owner = await get_category_owner(db, user_id, data.categoryid)
			if owner is None:
				raise CategoryNotFoundError
			expense.categoryid = data.categoryid
			expense.category_userid = owner
		elif "categoryid" in data.model_fields_set:
			expense.categoryid = None
			expense.category_userid = None
		if data.description is not None:
			expense.note = data.description

		await db.commit()
		await db.refresh(expense)

		return {
			"source": "manual",
			"id": expense.expenseid,
			"amount": float(expense.amount),
			"spent_on": expense.spent_on,
			"merchant": expense.merchant,
			"description": expense.note,
			"categoryid": expense.categoryid,
		}

	elif source == "plaid":
		tx = await db.get(PlaidTransaction, item_id)
		if not tx:
			return None
		item = await db.get(PlaidItem, tx.plaid_item_id)
		if not item or item.user_id != user_id:
			return None

		if {"amount", "spent_on"} & data.model_fields_set:
			raise PlaidExpenseFieldsError
		if "merchant" in data.model_fields_set:
			tx.user_merchant = data.merchant
		if "description" in data.model_fields_set:
			tx.user_note = data.description
		if "categoryid" in data.model_fields_set:
			if data.categoryid is None:
				tx.categoryid = None
				tx.category_userid = None
			else:
				owner = await get_category_owner(db, user_id, data.categoryid)
				if owner is None:
					raise CategoryNotFoundError
				tx.categoryid = data.categoryid
				tx.category_userid = owner

		await db.commit()
		await db.refresh(tx)
		categoryid = await db.scalar(
			select(plaid_effective_categoryid()).where(PlaidTransaction.id == tx.id)
		)

		return {
			"source": "plaid",
			"id": tx.id,
			"amount": float(tx.amount),
			"spent_on": tx.transaction_date,
			"merchant": (
				tx.user_merchant
				if tx.user_merchant is not None
				else tx.merchant_name or tx.name
			),
			"description": tx.user_note if tx.user_note is not None else tx.name,
			"categoryid": categoryid,
		}

	return None


async def delete_expense_item(
	db: AsyncSession,
	user_id: int,
	source: str,
	item_id: int,
) -> bool:
	if source == "manual":
		expense = await db.get(Expense, item_id)
		if not expense or expense.userid != user_id:
			return False
		await db.delete(expense)
		await db.commit()
		return True

	elif source == "plaid":
		tx = await db.get(PlaidTransaction, item_id)
		if not tx:
			return False
		item = await db.get(PlaidItem, tx.plaid_item_id)
		if not item or item.user_id != user_id:
			return False
		tx.hidden = True
		await db.commit()
		return True

	return False
