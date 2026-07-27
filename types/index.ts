import type {
  Category,
  Subcategory,
  Expense,
  Income,
  Budget,
  RecurringExpense,
  CategoryType,
} from "@prisma/client";

export type { Category, Subcategory, Expense, Income, Budget, RecurringExpense, CategoryType };

export type CategoryWithSubs = Category & { subcategories: Subcategory[] };

export type ExpenseWithCategory = Expense & {
  subcategory: Subcategory & { category: Category };
};

export type RecurringWithCategory = RecurringExpense & {
  subcategory: Subcategory & { category: Category };
};

export type SubcategoryWithCategory = Subcategory & { category: Category };
