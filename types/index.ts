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
  CategoryBudget,
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
  CategoryBudget,
};

export type { WeeklyStatus } from "@/lib/weekly";
export type {
  BudgetComparison,
  BudgetCategoryNode,
  EnvelopeNode,
  BudgetTrendPoint,
} from "@/lib/category-budget";

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
