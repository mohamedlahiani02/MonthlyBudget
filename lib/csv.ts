import "server-only";
import { prisma } from "@/lib/prisma";

function escapeCsv(value: string | number): string {
  const s = String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Export all expenses as CSV (one row per expense, with category context). */
export async function exportExpensesCsv(): Promise<string> {
  const expenses = await prisma.expense.findMany({
    orderBy: { date: "desc" },
    include: { subcategory: { include: { category: true } } },
  });
  const header = [
    "date",
    "amount",
    "description",
    "paymentMethod",
    "category",
    "categoryType",
    "subcategory",
  ];
  const rows = expenses.map((e) =>
    [
      e.date.toISOString().slice(0, 10),
      e.amount,
      e.description,
      e.paymentMethod,
      e.subcategory.category.name,
      e.subcategory.category.type,
      e.subcategory.name,
    ]
      .map(escapeCsv)
      .join(",")
  );
  return [header.join(","), ...rows].join("\n");
}

/** Parse a CSV string into rows (handles quoted fields). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim().length > 0));
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

/**
 * Import expenses from CSV. Expected columns (header row required):
 * date, amount, description, paymentMethod, category, categoryType, subcategory
 * Missing categories/subcategories are created automatically.
 */
export async function importExpensesCsv(text: string): Promise<ImportResult> {
  const rows = parseCsv(text);
  if (rows.length < 2) return { imported: 0, skipped: 0, errors: ["No data rows found"] };

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const idx = (name: string) => header.indexOf(name);
  const iDate = idx("date");
  const iAmount = idx("amount");
  const iDesc = idx("description");
  const iPay = idx("paymentmethod");
  const iCat = idx("category");
  const iType = idx("categorytype");
  const iSub = idx("subcategory");

  if (iDate < 0 || iAmount < 0 || iCat < 0 || iSub < 0) {
    return {
      imported: 0,
      skipped: 0,
      errors: ["CSV must contain at least: date, amount, category, subcategory"],
    };
  }

  const result: ImportResult = { imported: 0, skipped: 0, errors: [] };

  for (let r = 1; r < rows.length; r++) {
    const cols = rows[r];
    try {
      const amount = parseFloat(cols[iAmount]);
      const date = new Date(cols[iDate]);
      if (!Number.isFinite(amount) || isNaN(date.getTime())) {
        result.skipped++;
        continue;
      }
      const catName = (cols[iCat] ?? "").trim() || "Uncategorized";
      const type =
        (cols[iType] ?? "").trim().toLowerCase() === "fixed" ? "Fixed" : "Variable";
      const subName = (cols[iSub] ?? "").trim() || "General";

      let category = await prisma.category.findFirst({ where: { name: catName, type } });
      if (!category) {
        const count = await prisma.category.count();
        category = await prisma.category.create({
          data: { name: catName, type, position: count },
        });
      }
      let subcategory = await prisma.subcategory.findFirst({
        where: { name: subName, categoryId: category.id },
      });
      if (!subcategory) {
        const count = await prisma.subcategory.count({ where: { categoryId: category.id } });
        subcategory = await prisma.subcategory.create({
          data: { name: subName, categoryId: category.id, position: count },
        });
      }

      await prisma.expense.create({
        data: {
          amount,
          description: (cols[iDesc] ?? "").trim() || subName,
          date,
          paymentMethod: (cols[iPay] ?? "").trim() || "Other",
          subcategoryId: subcategory.id,
        },
      });
      result.imported++;
    } catch (err) {
      result.skipped++;
      result.errors.push(`Row ${r + 1}: ${(err as Error).message}`);
    }
  }

  return result;
}

/** Full database dump as a JSON string. */
export async function exportDatabaseJson(): Promise<string> {
  const [categories, subcategories, expenses, incomes, budgets, recurring] = await Promise.all([
    prisma.category.findMany(),
    prisma.subcategory.findMany(),
    prisma.expense.findMany(),
    prisma.income.findMany(),
    prisma.budget.findMany(),
    prisma.recurringExpense.findMany(),
  ]);
  return JSON.stringify(
    { exportedAt: new Date().toISOString(), categories, subcategories, expenses, incomes, budgets, recurring },
    null,
    2
  );
}
