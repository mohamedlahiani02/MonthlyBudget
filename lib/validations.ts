import { z } from "zod";

const idString = z.string().min(1);

export const incomeSchema = z.object({
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  description: z.string().min(1, "Description is required").max(200),
  date: z.coerce.date(),
});
export type IncomeInput = z.infer<typeof incomeSchema>;

export const expenseSchema = z.object({
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  description: z.string().min(1, "Description is required").max(200),
  date: z.coerce.date(),
  paymentMethod: z.string().min(1, "Payment method is required").max(50),
  subcategoryId: idString,
});
export type ExpenseInput = z.infer<typeof expenseSchema>;

export const categorySchema = z.object({
  name: z.string().min(1, "Name is required").max(80),
  type: z.enum(["Fixed", "Variable"]),
});
export type CategoryInput = z.infer<typeof categorySchema>;

export const subcategorySchema = z.object({
  name: z.string().min(1, "Name is required").max(80),
  categoryId: idString,
});
export type SubcategoryInput = z.infer<typeof subcategorySchema>;

export const budgetSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(3000),
  monthlyBudget: z.coerce.number().min(0),
  savingGoal: z.coerce.number().min(0).default(0),
});
export type BudgetInput = z.infer<typeof budgetSchema>;

export const recurringExpenseSchema = z.object({
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  description: z.string().max(200).default(""),
  dayOfMonth: z.coerce.number().int().min(1).max(28),
  subcategoryId: idString,
  active: z.coerce.boolean().default(true),
});
export type RecurringExpenseInput = z.infer<typeof recurringExpenseSchema>;

export const reorderSchema = z.object({
  ids: z.array(idString).min(1),
});
export type ReorderInput = z.infer<typeof reorderSchema>;

export const loginSchema = z.object({
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(4, "New password must be at least 4 characters"),
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const PAYMENT_METHODS = [
  "Cash",
  "Card",
  "Bank Transfer",
  "Mobile Payment",
  "Cheque",
  "Other",
] as const;
