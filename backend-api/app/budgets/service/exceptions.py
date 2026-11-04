class CategoryNotFoundError(Exception):
	"""Raised when a specified category does not exist or is inaccessible."""
	pass


class BudgetExistsError(Exception):
	"""Raised when a budget already exists for the category."""
	pass


class BudgetHierarchyError(Exception):
	"""Raised when subcategory budgets exceed their parent or vice versa.

	The message is safe to show directly to the user.
	"""
	pass

