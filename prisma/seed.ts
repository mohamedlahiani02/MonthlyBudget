import { PrismaClient, CategoryType } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORIES: {
  name: string;
  type: CategoryType;
  subs: string[];
}[] = [
  // Fixed
  { name: "Rent", type: "Fixed", subs: ["Apartment"] },
  { name: "Utilities", type: "Fixed", subs: ["STEG", "Water", "Internet"] },
  { name: "Insurance", type: "Fixed", subs: ["Car Insurance", "Health Insurance"] },
  { name: "Phone", type: "Fixed", subs: ["Mobile Plan"] },
  // Variable
  { name: "Food", type: "Variable", subs: ["Groceries", "Coffee", "Restaurant"] },
  { name: "Entertainment", type: "Variable", subs: ["Cinema", "Netflix", "Gaming", "Padel"] },
  { name: "Shopping", type: "Variable", subs: ["Clothes", "Electronics"] },
  { name: "Transport", type: "Variable", subs: ["Fuel", "Taxi"] },
  { name: "Health", type: "Variable", subs: ["Pharmacy", "Doctor"] },
  { name: "Travel", type: "Variable", subs: ["Flights", "Hotels"] },
];

const PAYMENT_METHODS = ["Cash", "Card", "Bank Transfer", "Mobile Payment"];

function randomAmount(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  console.log("🌱 Seeding database...");

  // Clean slate
  await prisma.expense.deleteMany();
  await prisma.recurringExpense.deleteMany();
  await prisma.subcategory.deleteMany();
  await prisma.category.deleteMany();
  await prisma.income.deleteMany();
  await prisma.budget.deleteMany();

  // Categories + subcategories
  const subIdByName = new Map<string, string>();
  for (let c = 0; c < CATEGORIES.length; c++) {
    const cat = CATEGORIES[c];
    const created = await prisma.category.create({
      data: {
        name: cat.name,
        type: cat.type,
        position: c,
        subcategories: {
          create: cat.subs.map((name, i) => ({ name, position: i })),
        },
      },
      include: { subcategories: true },
    });
    for (const s of created.subcategories) {
      subIdByName.set(`${cat.name}:${s.name}`, s.id);
    }
  }

  const now = new Date();
  const year = now.getFullYear();

  // Recurring fixed expenses
  const recurringDefs = [
    { key: "Utilities:STEG", amount: 180, day: 5, desc: "STEG electricity & gas" },
    { key: "Utilities:Water", amount: 45, day: 6, desc: "SONEDE water" },
    { key: "Utilities:Internet", amount: 60, day: 3, desc: "Fibre internet" },
    { key: "Rent:Apartment", amount: 750, day: 1, desc: "Monthly rent" },
    { key: "Phone:Mobile Plan", amount: 40, day: 10, desc: "Mobile plan" },
    { key: "Entertainment:Netflix", amount: 35, day: 15, desc: "Netflix subscription" },
  ];
  for (const r of recurringDefs) {
    const subId = subIdByName.get(r.key);
    if (!subId) continue;
    await prisma.recurringExpense.create({
      data: {
        amount: r.amount,
        description: r.desc,
        dayOfMonth: r.day,
        subcategoryId: subId,
        active: true,
      },
    });
  }

  // Budgets, income and expenses for the last 6 months (including current)
  const variableKeys = [
    "Food:Groceries",
    "Food:Coffee",
    "Food:Restaurant",
    "Entertainment:Cinema",
    "Entertainment:Gaming",
    "Entertainment:Padel",
    "Shopping:Clothes",
    "Shopping:Electronics",
    "Transport:Fuel",
    "Transport:Taxi",
    "Health:Pharmacy",
    "Travel:Hotels",
  ];

  for (let back = 5; back >= 0; back--) {
    const d = new Date(year, now.getMonth() - back, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const isCurrent = back === 0;
    const daysInMonth = new Date(y, m, 0).getDate();
    const maxDay = isCurrent ? now.getDate() : daysInMonth;

    // Budget
    await prisma.budget.create({
      data: { month: m, year: y, monthlyBudget: 2500, savingGoal: 600 },
    });

    // Income (salary + occasional freelance)
    await prisma.income.create({
      data: {
        amount: 3200,
        description: "Monthly salary",
        date: new Date(y, m - 1, 1, 9, 0, 0),
      },
    });
    if (Math.random() > 0.5) {
      await prisma.income.create({
        data: {
          amount: randomAmount(200, 700),
          description: "Freelance project",
          date: new Date(y, m - 1, Math.min(20, maxDay), 12, 0, 0),
        },
      });
    }

    // Fixed recurring expenses materialised for the month
    for (const r of recurringDefs) {
      const subId = subIdByName.get(r.key);
      if (!subId) continue;
      const day = Math.min(r.day, maxDay);
      if (day < 1) continue;
      await prisma.expense.create({
        data: {
          amount: r.amount,
          description: r.desc,
          date: new Date(y, m - 1, day, 12, 0, 0),
          paymentMethod: "Bank Transfer",
          subcategoryId: subId,
        },
      });
    }

    // Random variable expenses
    const numExpenses = 18 + Math.floor(Math.random() * 12);
    for (let i = 0; i < numExpenses; i++) {
      const key = pick(variableKeys);
      const subId = subIdByName.get(key);
      if (!subId) continue;
      const day = 1 + Math.floor(Math.random() * maxDay);
      await prisma.expense.create({
        data: {
          amount: randomAmount(8, 120),
          description: key.split(":")[1],
          date: new Date(y, m - 1, day, 14, 0, 0),
          paymentMethod: pick(PAYMENT_METHODS),
          subcategoryId: subId,
        },
      });
    }
  }

  const counts = {
    categories: await prisma.category.count(),
    subcategories: await prisma.subcategory.count(),
    expenses: await prisma.expense.count(),
    income: await prisma.income.count(),
    budgets: await prisma.budget.count(),
    recurring: await prisma.recurringExpense.count(),
  };
  console.log("✅ Seed complete:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
