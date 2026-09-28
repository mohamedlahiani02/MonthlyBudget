import "server-only";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { monthRange } from "@/lib/utils";
import { PAYMENT_METHODS } from "@/lib/validations";
import { generateRecurringForMonth } from "@/lib/recurring";
import { computeCarryOut, getCarryIn, isCarried } from "@/lib/carryover";
import { getAccountsWithBalances } from "@/lib/accounts";
import { getBudgetComparison } from "@/lib/category-budget";

/** Expected, user-facing failure (bad reference, etc.) reported as a tool error. */
class ToolInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ToolInputError";
  }
}

const round2 = (n: number): number => Number(n.toFixed(2));

const yearField = z.number().int().min(2000).max(3000).describe("Four-digit year, e.g. 2026");
const monthField = z.number().int().min(1).max(12).describe("Month number, 1 = January ... 12 = December");
const idField = z.string().min(1).max(64);
const isoDateField = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD")
  .describe("Calendar date in YYYY-MM-DD format");

/** Store calendar dates at 12:00 UTC so they fall in the same day/month in any server timezone. */
function parseCalendarDate(value: string): Date {
  const [y, m, d] = value.split("-").map((p) => Number.parseInt(p, 10));
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    throw new ToolInputError(`Invalid calendar date: ${value}`);
  }
  return date;
}

async function resolveAccountId(accountId: string | undefined): Promise<string> {
  if (accountId) {
    const account = await prisma.account.findUnique({ where: { id: accountId } });
    if (!account) throw new ToolInputError(`Unknown accountId: ${accountId}`);
    if (!account.isActive) throw new ToolInputError(`Account ${accountId} is inactive`);
    return account.id;
  }
  const fallback =
    (await prisma.account.findFirst({ where: { isDefault: true, isActive: true } })) ??
    (await prisma.account.findFirst({ where: { isActive: true }, orderBy: { position: "asc" } }));
  if (!fallback) {
    throw new ToolInputError("No active account exists; create one in the app or pass accountId");
  }
  return fallback.id;
}

function success<T extends Record<string, unknown>>(data: T): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data) }],
    structuredContent: data,
  };
}

function failure(message: string): CallToolResult {
  return { isError: true, content: [{ type: "text", text: message }] };
}

/** Wrap a handler with structured logging and uniform error mapping. */
function instrument<A>(
  name: string,
  handler: (args: A) => Promise<Record<string, unknown>>
): (args: A) => Promise<CallToolResult> {
  return async (args: A) => {
    const startedAt = Date.now();
    try {
      const data = await handler(args);
      logger.info({ event: "mcp.tool_call", tool: name, args, outcome: "ok", durationMs: Date.now() - startedAt });
      return success(data);
    } catch (err) {
      const durationMs = Date.now() - startedAt;
      if (err instanceof ToolInputError) {
        logger.warn({ event: "mcp.tool_call", tool: name, args, outcome: "invalid_input", reason: err.message, durationMs });
        return failure(err.message);
      }
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
        logger.warn({ event: "mcp.tool_call", tool: name, args, outcome: "invalid_reference", durationMs });
        return failure("A referenced record does not exist");
      }
      logger.error({ event: "mcp.tool_call", tool: name, args, outcome: "error", err, durationMs });
      return failure("Internal error while executing the tool");
    }
  };
}

const transactionShape = z.object({
  id: z.string(),
  type: z.enum(["expense", "income"]),
  date: z.string().describe("ISO 8601 timestamp"),
  amount: z.number(),
  description: z.string(),
  categoryId: z.string().nullable(),
  category: z.string().nullable(),
  subcategoryId: z.string().nullable(),
  subcategory: z.string().nullable(),
  paymentMethod: z.string().nullable(),
  accountId: z.string().nullable(),
  account: z.string().nullable(),
});
type TransactionOut = z.infer<typeof transactionShape>;

const expenseOutShape = {
  id: z.string(),
  amount: z.number(),
  date: z.string(),
  description: z.string(),
  paymentMethod: z.string(),
  categoryId: z.string(),
  category: z.string(),
  subcategoryId: z.string(),
  subcategory: z.string(),
  accountId: z.string().nullable(),
  account: z.string().nullable(),
};

const incomeOutShape = {
  id: z.string(),
  amount: z.number(),
  date: z.string(),
  description: z.string(),
  accountId: z.string().nullable(),
  account: z.string().nullable(),
};

export function registerBudgetTools(server: McpServer): void {
  server.registerTool(
    "get_monthly_summary",
    {
      title: "Monthly summary",
      description:
        "Income, expenses (fixed/variable split), carry-in from the previous month, budget and resulting balance for one month. " +
        "Materialises that month's recurring expenses first, exactly as opening the dashboard does.",
      inputSchema: { year: yearField, month: monthField },
      outputSchema: {
        year: z.number(),
        month: z.number(),
        income: z.number().describe("Income recorded in the month"),
        carryIn: z.number().describe("Surplus carried in from the previous month"),
        totalIncome: z.number().describe("income + carryIn"),
        expenses: z.number(),
        fixedExpenses: z.number(),
        variableExpenses: z.number(),
        carryOut: z.number().describe("Surplus carried forward to next month"),
        balance: z.number().describe("totalIncome - expenses - carryOut"),
        budget: z
          .object({
            monthlyBudget: z.number(),
            savingGoal: z.number(),
            remaining: z.number().describe("monthlyBudget - expenses"),
            utilizationPct: z.number(),
          })
          .nullable(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    instrument("get_monthly_summary", async ({ year, month }: { year: number; month: number }) => {
      await generateRecurringForMonth(year, month);
      const { start, end } = monthRange(year, month);
      const [incomeAgg, expenseRows, budget, carryIn, carried] = await Promise.all([
        prisma.income.aggregate({ _sum: { amount: true }, where: { date: { gte: start, lt: end } } }),
        prisma.expense.findMany({
          where: { date: { gte: start, lt: end } },
          select: { amount: true, subcategory: { select: { category: { select: { type: true } } } } },
        }),
        prisma.budget.findUnique({ where: { month_year: { month, year } } }),
        getCarryIn(year, month),
        isCarried(year, month),
      ]);

      let fixed = 0;
      let variable = 0;
      for (const e of expenseRows) {
        if (e.subcategory.category.type === "Fixed") fixed += e.amount;
        else variable += e.amount;
      }
      const income = incomeAgg._sum.amount ?? 0;
      const expenses = fixed + variable;
      const carryOut = computeCarryOut(carried, income, carryIn, expenses);
      const totalIncome = income + carryIn;

      return {
        year,
        month,
        income: round2(income),
        carryIn: round2(carryIn),
        totalIncome: round2(totalIncome),
        expenses: round2(expenses),
        fixedExpenses: round2(fixed),
        variableExpenses: round2(variable),
        carryOut: round2(carryOut),
        balance: round2(totalIncome - expenses - carryOut),
        budget: budget
          ? {
              monthlyBudget: round2(budget.monthlyBudget),
              savingGoal: round2(budget.savingGoal),
              remaining: round2(budget.monthlyBudget - expenses),
              utilizationPct:
                budget.monthlyBudget > 0 ? round2((expenses / budget.monthlyBudget) * 100) : 0,
            }
          : null,
      };
    })
  );

  server.registerTool(
    "list_transactions",
    {
      title: "List transactions",
      description:
        "Expenses and/or income for one month, newest first. Filter expenses by categoryId or subcategoryId " +
        "(ids from get_categories); category filters exclude income.",
      inputSchema: {
        year: yearField,
        month: monthField,
        type: z.enum(["expense", "income", "all"]).default("all"),
        categoryId: idField.optional(),
        subcategoryId: idField.optional(),
        limit: z.number().int().min(1).max(500).default(100),
      },
      outputSchema: {
        transactions: z.array(transactionShape),
        total: z.number().int().describe("Number of matching transactions before the limit"),
        truncated: z.boolean(),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    instrument(
      "list_transactions",
      async (args: {
        year: number;
        month: number;
        type: "expense" | "income" | "all";
        categoryId?: string;
        subcategoryId?: string;
        limit: number;
      }) => {
        const { start, end } = monthRange(args.year, args.month);
        const categoryFiltered = Boolean(args.categoryId || args.subcategoryId);
        const includeExpenses = args.type !== "income";
        const includeIncome = args.type !== "expense" && !categoryFiltered;

        const expenseWhere: Prisma.ExpenseWhereInput = { date: { gte: start, lt: end } };
        if (args.subcategoryId) expenseWhere.subcategoryId = args.subcategoryId;
        else if (args.categoryId) expenseWhere.subcategory = { categoryId: args.categoryId };

        const [expenses, incomes] = await Promise.all([
          includeExpenses
            ? prisma.expense.findMany({
                where: expenseWhere,
                orderBy: { date: "desc" },
                take: args.limit + 1,
                include: { subcategory: { include: { category: true } }, account: true },
              })
            : Promise.resolve([]),
          includeIncome
            ? prisma.income.findMany({
                where: { date: { gte: start, lt: end } },
                orderBy: { date: "desc" },
                take: args.limit + 1,
                include: { account: true },
              })
            : Promise.resolve([]),
        ]);
        const [expenseCount, incomeCount] = await Promise.all([
          includeExpenses ? prisma.expense.count({ where: expenseWhere }) : Promise.resolve(0),
          includeIncome
            ? prisma.income.count({ where: { date: { gte: start, lt: end } } })
            : Promise.resolve(0),
        ]);

        const merged: TransactionOut[] = [
          ...expenses.map((e) => ({
            id: e.id,
            type: "expense" as const,
            date: e.date.toISOString(),
            amount: e.amount,
            description: e.description,
            categoryId: e.subcategory.category.id,
            category: e.subcategory.category.name,
            subcategoryId: e.subcategory.id,
            subcategory: e.subcategory.name,
            paymentMethod: e.paymentMethod,
            accountId: e.accountId,
            account: e.account?.label ?? null,
          })),
          ...incomes.map((i) => ({
            id: i.id,
            type: "income" as const,
            date: i.date.toISOString(),
            amount: i.amount,
            description: i.description,
            categoryId: null,
            category: null,
            subcategoryId: null,
            subcategory: null,
            paymentMethod: null,
            accountId: i.accountId,
            account: i.account?.label ?? null,
          })),
        ].sort((a, b) => b.date.localeCompare(a.date));

        const total = expenseCount + incomeCount;
        const transactions = merged.slice(0, args.limit);
        return { transactions, total, truncated: total > transactions.length };
      }
    )
  );

  server.registerTool(
    "add_expense",
    {
      title: "Add expense",
      description:
        "Record a new expense. Expenses belong to a subcategory: call get_categories first to obtain subcategoryId. " +
        "If accountId is omitted the default account is used (see list_accounts).",
      inputSchema: {
        amount: z.number().positive().max(1_000_000_000),
        subcategoryId: idField.describe("Subcategory id from get_categories"),
        date: isoDateField,
        paymentMethod: z.enum(PAYMENT_METHODS),
        description: z.string().trim().min(1).max(200).optional().describe("Defaults to the subcategory name"),
        accountId: idField.optional(),
      },
      outputSchema: expenseOutShape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    instrument(
      "add_expense",
      async (args: {
        amount: number;
        subcategoryId: string;
        date: string;
        paymentMethod: (typeof PAYMENT_METHODS)[number];
        description?: string;
        accountId?: string;
      }) => {
        const date = parseCalendarDate(args.date);
        const subcategory = await prisma.subcategory.findUnique({ where: { id: args.subcategoryId } });
        if (!subcategory) throw new ToolInputError(`Unknown subcategoryId: ${args.subcategoryId}`);
        const accountId = await resolveAccountId(args.accountId);

        const e = await prisma.expense.create({
          data: {
            amount: round2(args.amount),
            date,
            description: args.description ?? subcategory.name,
            paymentMethod: args.paymentMethod,
            subcategoryId: subcategory.id,
            accountId,
          },
          include: { subcategory: { include: { category: true } }, account: true },
        });
        return {
          id: e.id,
          amount: e.amount,
          date: e.date.toISOString(),
          description: e.description,
          paymentMethod: e.paymentMethod,
          categoryId: e.subcategory.category.id,
          category: e.subcategory.category.name,
          subcategoryId: e.subcategory.id,
          subcategory: e.subcategory.name,
          accountId: e.accountId,
          account: e.account?.label ?? null,
        };
      }
    )
  );

  server.registerTool(
    "add_income",
    {
      title: "Add income",
      description: "Record a new income entry. If accountId is omitted the default account is used.",
      inputSchema: {
        amount: z.number().positive().max(1_000_000_000),
        date: isoDateField,
        description: z.string().trim().min(1).max(200),
        accountId: idField.optional(),
      },
      outputSchema: incomeOutShape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    instrument(
      "add_income",
      async (args: { amount: number; date: string; description: string; accountId?: string }) => {
        const date = parseCalendarDate(args.date);
        const accountId = await resolveAccountId(args.accountId);
        const i = await prisma.income.create({
          data: { amount: round2(args.amount), date, description: args.description, accountId },
          include: { account: true },
        });
        return {
          id: i.id,
          amount: i.amount,
          date: i.date.toISOString(),
          description: i.description,
          accountId: i.accountId,
          account: i.account?.label ?? null,
        };
      }
    )
  );

  server.registerTool(
    "get_categories",
    {
      title: "Budget categories",
      description: "All budget categories (Fixed or Variable) with their subcategories, in display order.",
      inputSchema: {},
      outputSchema: {
        categories: z.array(
          z.object({
            id: z.string(),
            name: z.string(),
            type: z.enum(["Fixed", "Variable"]),
            subcategories: z.array(z.object({ id: z.string(), name: z.string() })),
          })
        ),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    instrument("get_categories", async () => {
      const categories = await prisma.category.findMany({
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        include: { subcategories: { orderBy: [{ position: "asc" }, { createdAt: "asc" }] } },
      });
      return {
        categories: categories.map((c) => ({
          id: c.id,
          name: c.name,
          type: c.type,
          subcategories: c.subcategories.map((s) => ({ id: s.id, name: s.name })),
        })),
      };
    })
  );

  server.registerTool(
    "list_accounts",
    {
      title: "Accounts",
      description: "Accounts (cash, bank, other) with live balances. Use an id as accountId when adding entries.",
      inputSchema: {},
      outputSchema: {
        accounts: z.array(
          z.object({
            id: z.string(),
            label: z.string(),
            type: z.enum(["Caisse", "Banque", "Autre"]),
            bankName: z.string().nullable(),
            isDefault: z.boolean(),
            isActive: z.boolean(),
            balance: z.number(),
          })
        ),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    instrument("list_accounts", async () => {
      const accounts = await getAccountsWithBalances();
      return {
        accounts: accounts.map((a) => ({
          id: a.id,
          label: a.label,
          type: a.type,
          bankName: a.bankName,
          isDefault: a.isDefault,
          isActive: a.isActive,
          balance: a.balance,
        })),
      };
    })
  );

  server.registerTool(
    "get_budget_status",
    {
      title: "Budget vs actual",
      description:
        "Per-category budget versus actual spending for one month, including rollover carryover. " +
        "status is ok (<80%), near (80-99%), over (>=100%) or none (no budget).",
      inputSchema: { year: yearField, month: monthField },
      outputSchema: {
        year: z.number(),
        month: z.number(),
        hasAnyBudget: z.boolean(),
        totals: z.object({ budgeted: z.number(), spent: z.number(), remaining: z.number() }),
        categories: z.array(
          z.object({
            categoryId: z.string(),
            name: z.string(),
            type: z.string(),
            budgeted: z.number(),
            carryover: z.number(),
            available: z.number(),
            spent: z.number(),
            remaining: z.number(),
            pct: z.number().nullable(),
            status: z.enum(["ok", "near", "over", "none"]),
          })
        ),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    instrument("get_budget_status", async ({ year, month }: { year: number; month: number }) => {
      const cmp = await getBudgetComparison(year, month);
      return {
        year: cmp.year,
        month: cmp.month,
        hasAnyBudget: cmp.hasAnyBudget,
        totals: cmp.totals,
        categories: cmp.categories.map((c) => ({
          categoryId: c.categoryId,
          name: c.name,
          type: c.type,
          budgeted: c.budgeted,
          carryover: c.carryover,
          available: c.available,
          spent: c.spent,
          remaining: c.remaining,
          pct: c.pct,
          status: c.status,
        })),
      };
    })
  );
}
