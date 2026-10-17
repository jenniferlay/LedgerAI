import type {
  ExpenseFormErrors,
  ExpenseFormValues,
  ExpensePayload,
} from './types';

const AMOUNT_REGEX = /^\d+(\.\d{1,2})?$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DOLLARS = 2_147_483_647;

export function getTodayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getYesterdayIsoDate(): string {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseAmount(amountStr: string): {
  dollars: number;
  cents: number;
} | null {
  const normalized = amountStr.trim().replace(',', '.').replace('-', '');
  if (!AMOUNT_REGEX.test(normalized)) {
    return null;
  }

  const parts = normalized.split('.');
  const dollars = parseInt(parts[0], 10);
  const cents = parts[1] ? parseInt(parts[1].padEnd(2, '0'), 10) : 0;

  if (Number.isNaN(dollars) || Number.isNaN(cents)) {
    return null;
  }

  return { dollars, cents };
}

export function validateAmount(amountStr: string): string | undefined {
  const trimmed = amountStr.trim();
  if (!trimmed) {
    return 'Amount is required.';
  }

  const parsed = parseAmount(trimmed);
  if (!parsed) {
    return 'Enter a valid amount (e.g. 14.99).';
  }

  if (parsed.dollars === 0 && parsed.cents === 0) {
    return 'Amount must be greater than $0.00.';
  }

  if (parsed.dollars > MAX_DOLLARS) {
    return 'Amount exceeds maximum limit ($2,147,483,647).';
  }

  return undefined;
}

export function validateNote(note: string): string | undefined {
  const trimmed = note.trim();
  if (!trimmed) {
    return 'Description or note is required.';
  }
  if (trimmed.length > 500) {
    return 'Note cannot exceed 500 characters.';
  }
  return undefined;
}

export function validateMerchant(merchant: string): string | undefined {
  const trimmed = merchant.trim();
  if (trimmed.length > 255) {
    return 'Merchant name cannot exceed 255 characters.';
  }
  return undefined;
}

export function validateSpentOn(dateStr: string): string | undefined {
  const trimmed = dateStr.trim();
  if (!trimmed) {
    return 'Date is required.';
  }

  if (!DATE_REGEX.test(trimmed)) {
    return 'Date must be in YYYY-MM-DD format.';
  }

  const [year, month, day] = trimmed.split('-').map(Number);
  const parsedDate = new Date(year, month - 1, day);

  if (
    parsedDate.getFullYear() !== year ||
    parsedDate.getMonth() !== month - 1 ||
    parsedDate.getDate() !== day
  ) {
    return 'Enter a valid calendar date.';
  }

  return undefined;
}

export function validateExpenseForm(values: ExpenseFormValues): {
  isValid: boolean;
  errors: ExpenseFormErrors;
  payload?: ExpensePayload;
} {
  const errors: ExpenseFormErrors = {};

  const amountError = validateAmount(values.amount);
  if (amountError) errors.amount = amountError;

  const noteError = validateNote(values.note);
  if (noteError) errors.note = noteError;

  const merchantError = validateMerchant(values.merchant);
  if (merchantError) errors.merchant = merchantError;

  const spentOnError = validateSpentOn(values.spentOn);
  if (spentOnError) errors.spentOn = spentOnError;

  const isValid = Object.keys(errors).length === 0;

  if (!isValid) {
    return { isValid: false, errors };
  }

  const parsedAmount = parseAmount(values.amount)!;
  const isIncome = values.type === 'income';
  const multiplier = isIncome ? -1 : 1;

  return {
    isValid: true,
    errors: {},
    payload: {
      amount_dollars: parsedAmount.dollars * multiplier,
      amount_cents: parsedAmount.cents,
      note: values.note.trim(),
      merchant: values.merchant.trim() ? values.merchant.trim() : null,
      spent_on: values.spentOn.trim(),
      categoryid: values.categoryId ?? 1,
    },
  };
}
