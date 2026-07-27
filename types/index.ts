import type {
  Category,
  Subcategory,
  Expense,
  Income,
  Budget,
  RecurringExpense,
  CategoryType,
  Account,
  AccountType,
  Transfer,
} from "@prisma/client";

export type {
  Category,
  Subcategory,
  Expense,
  Income,
  Budget,
  RecurringExpense,
  CategoryType,
  Account,
  AccountType,
  Transfer,
};

export type CategoryWithSubs = Category & { subcategories: Subcategory[] };

export type ExpenseWithCategory = Expense & {
  subcategory: Subcategory & { category: Category };
  account?: Account | null;
};

export type RecurringWithCategory = RecurringExpense & {
  subcategory: Subcategory & { category: Category };
  account?: Account | null;
};

export type SubcategoryWithCategory = Subcategory & { category: Category };

export type IncomeWithAccount = Income & { account?: Account | null };

export type AccountWithBalanceDTO = Account & {
  balance: number;
  incomeTotal: number;
  expenseTotal: number;
  transferIn: number;
  transferOut: number;
};

export type TransferWithAccounts = Transfer & {
  fromAccount: Account;
  toAccount: Account;
};
