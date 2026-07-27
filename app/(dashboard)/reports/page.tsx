import {
  TrendingUp,
  TrendingDown,
  PiggyBank,
  CalendarCheck,
  CalendarX,
  BarChart2,
  LineChart as LineIcon,
} from "lucide-react";
import { getYearlyData, getYearBreakdown } from "@/lib/finance";
import { formatCurrency } from "@/lib/utils";
import { KpiCard } from "@/components/dashboard/kpi-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { YearSelect } from "@/components/reports/year-select";
import {
  LazyMonthlyBar,
  LazyCategoryPie,
  LazyFixedVsVariablePie,
  LazySavingsLine,
  LazySpendingLine,
} from "@/components/charts/lazy";

export const dynamic = "force-dynamic";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { year: yearParam } = await searchParams;
  const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();

  const [yearly, breakdown] = await Promise.all([
    getYearlyData(year),
    getYearBreakdown(year),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">Yearly analytics and visual breakdowns.</p>
        </div>
        <YearSelect year={year} />
      </div>

      {/* Yearly KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Annual Income" value={yearly.annualIncome} icon={<TrendingUp />} accent="primary" index={0} />
        <KpiCard label="Annual Expenses" value={yearly.annualExpenses} icon={<TrendingDown />} accent="destructive" index={1} />
        <KpiCard label="Annual Savings" value={yearly.annualSavings} icon={<PiggyBank />} accent="accent" index={2} />
        <KpiCard label="Avg Monthly Income" value={yearly.averageMonthlyIncome} icon={<TrendingUp />} accent="muted" index={3} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard label="Avg Monthly Expenses" value={yearly.averageMonthlyExpenses} icon={<TrendingDown />} accent="muted" index={4} />
        <Card className="p-5">
          <div className="flex items-start justify-between">
            <p className="text-sm text-muted-foreground">Best Saving Month</p>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <CalendarCheck className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-semibold">{yearly.bestSavingMonth?.month ?? "—"}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {yearly.bestSavingMonth ? formatCurrency(yearly.bestSavingMonth.value) : "No data"}
          </p>
        </Card>
        <Card className="p-5">
          <div className="flex items-start justify-between">
            <p className="text-sm text-muted-foreground">Worst Spending Month</p>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-destructive/15 text-destructive">
              <CalendarX className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-semibold">{yearly.worstSpendingMonth?.month ?? "—"}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {yearly.worstSpendingMonth ? formatCurrency(yearly.worstSpendingMonth.value) : "No data"}
          </p>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Monthly Income vs Expenses" icon={<BarChart2 className="h-4 w-4" />}>
          <LazyMonthlyBar data={yearly.series} />
        </ChartCard>
        <ChartCard title="Savings Evolution" icon={<LineIcon className="h-4 w-4" />}>
          <LazySavingsLine data={yearly.series} />
        </ChartCard>
        <ChartCard title="Monthly Spending" icon={<LineIcon className="h-4 w-4" />}>
          <LazySpendingLine data={yearly.series} />
        </ChartCard>
        <ChartCard title="Fixed vs Variable" badge="Split">
          <LazyFixedVsVariablePie data={breakdown.fixedVsVariable} />
        </ChartCard>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Expenses by Category</CardTitle>
            <CardDescription>Across {year}</CardDescription>
          </CardHeader>
          <CardContent>
            <LazyCategoryPie data={breakdown.categoryBreakdown} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  icon,
  badge,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          {icon && (
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
              {icon}
            </span>
          )}
          <CardTitle>{title}</CardTitle>
          {badge && <Badge variant="secondary">{badge}</Badge>}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
