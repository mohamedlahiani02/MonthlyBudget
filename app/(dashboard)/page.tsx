import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  CalendarDays,
  Landmark,
  ShoppingCart,
  Flame,
  Gauge,
  Sun,
} from "lucide-react";
import { getDashboardData } from "@/lib/finance";
import { monthName } from "@/lib/utils";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { BudgetRing } from "@/components/dashboard/budget-ring";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { TopCategories } from "@/components/dashboard/top-categories";
import { SpendingHeatmap } from "@/components/dashboard/spending-heatmap";
import { PeriodSelect } from "@/components/dashboard/period-select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LazyMonthlyBar, LazyCategoryPie } from "@/components/charts/lazy";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const now = new Date();
  const { month: monthParam, year: yearParam } = await searchParams;
  const year = yearParam ? parseInt(yearParam, 10) : now.getFullYear();
  const month = monthParam ? parseInt(monthParam, 10) : now.getMonth() + 1;

  const data = await getDashboardData(year, month, now);
  const m = data.month;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {monthName(month)} {year} · your financial overview
          </p>
        </div>
        <PeriodSelect month={month} year={year} />
      </div>

      {/* Top KPI grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Monthly Income" value={m.income} icon={<TrendingUp />} accent="primary" index={0} />
        <KpiCard label="Monthly Expenses" value={m.expenses} icon={<TrendingDown />} accent="destructive" index={1} />
        <KpiCard
          label="Remaining Budget"
          value={m.remainingBudget}
          icon={<Wallet />}
          accent={m.remainingBudget < 0 ? "destructive" : "accent"}
          index={2}
        />
        <KpiCard label="Savings" value={m.savings} icon={<PiggyBank />} accent="primary" index={3} />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Fixed Expenses" value={m.fixed} icon={<Landmark />} accent="accent" index={4} />
        <KpiCard label="Variable Expenses" value={m.variable} icon={<ShoppingCart />} accent="muted" index={5} />
        <KpiCard
          label="Budget Utilization"
          value={m.utilization}
          suffix="%"
          decimals={0}
          icon={<Gauge />}
          accent={m.utilization >= 100 ? "destructive" : "primary"}
          index={6}
        />
        <KpiCard
          label="Biggest Expense"
          value={m.biggestExpense?.amount ?? 0}
          icon={<Flame />}
          accent="destructive"
          hint={m.biggestExpense?.description ?? "—"}
          index={7}
        />
      </div>

      {/* Daily + average */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Today's Income" value={data.today.income} icon={<Sun />} accent="primary" index={8} />
        <KpiCard label="Today's Expenses" value={data.today.expenses} icon={<CalendarDays />} accent="destructive" index={9} />
        <KpiCard label="Avg. Daily Spending" value={m.averageDaily} icon={<Gauge />} accent="muted" index={10} />
      </div>

      {/* Charts + ring */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Income vs Expenses</CardTitle>
            <CardDescription>Monthly trend across the year</CardDescription>
          </CardHeader>
          <CardContent>
            <LazyMonthlyBar data={data.monthlySeries} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Budget Progress</CardTitle>
            <CardDescription>This month's utilization</CardDescription>
          </CardHeader>
          <CardContent>
            <BudgetRing utilization={m.utilization} spent={m.expenses} budget={m.budget} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
            <CardDescription>This month</CardDescription>
          </CardHeader>
          <CardContent>
            <LazyCategoryPie data={data.categoryBreakdown} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Categories</CardTitle>
            <CardDescription>Where your money goes</CardDescription>
          </CardHeader>
          <CardContent>
            <TopCategories categories={data.topCategories} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Spending Heatmap</CardTitle>
            <CardDescription>Daily activity this month</CardDescription>
          </CardHeader>
          <CardContent>
            <SpendingHeatmap year={year} month={month} data={data.heatmap} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Latest income and expenses</CardDescription>
        </CardHeader>
        <CardContent>
          <RecentTransactions expenses={data.recentExpenses} income={data.recentIncome} />
        </CardContent>
      </Card>
    </div>
  );
}
