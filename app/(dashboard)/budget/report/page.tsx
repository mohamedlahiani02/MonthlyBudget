import Link from "next/link";
import { ArrowLeft, TrendingUp, TrendingDown, Scale } from "lucide-react";
import { getBudgetComparison, getBudgetTrend } from "@/lib/category-budget";
import { formatCurrency, monthName } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PeriodSelect } from "@/components/dashboard/period-select";
import { VarianceTable } from "@/components/budget/variance-table";
import { LazyBudgetVsActualBar } from "@/components/charts/lazy";

export const dynamic = "force-dynamic";

export default async function BudgetReportPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const now = new Date();
  const { month: mp, year: yp } = await searchParams;
  const year = yp ? parseInt(yp, 10) : now.getFullYear();
  const month = mp ? parseInt(mp, 10) : now.getMonth() + 1;

  const [comparison, trend] = await Promise.all([
    getBudgetComparison(year, month),
    getBudgetTrend(year, month, 6),
  ]);

  const t = comparison.totals;
  const overCount = comparison.categories.filter((c) => c.budgeted > 0 && c.status === "over").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/budget"
            className="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to budget
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">Budget vs Actual</h1>
          <p className="text-sm text-muted-foreground">
            {monthName(month)} {year} · compare what you budgeted with what you spent
          </p>
        </div>
        <PeriodSelect month={month} year={year} />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard label="Budgeted" value={t.budgeted} icon={<Scale className="h-4 w-4" />} accent="accent" />
        <SummaryCard label="Spent" value={t.spent} icon={<TrendingDown className="h-4 w-4" />} accent="primary" />
        <SummaryCard
          label={t.remaining < 0 ? "Over budget" : "Remaining"}
          value={Math.abs(t.remaining)}
          icon={t.remaining < 0 ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
          accent={t.remaining < 0 ? "destructive" : "primary"}
        />
        <SummaryCard
          label="Categories over"
          value={overCount}
          icon={<TrendingDown className="h-4 w-4" />}
          accent={overCount > 0 ? "destructive" : "muted"}
          isCount
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Variance by category</CardTitle>
          <CardDescription>Tap a category to see its subcategory envelopes.</CardDescription>
        </CardHeader>
        <CardContent>
          <VarianceTable data={comparison} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Budgeted vs Actual — last 6 months</CardTitle>
          <CardDescription>Spot the trend and readjust next month's budget.</CardDescription>
        </CardHeader>
        <CardContent>
          <LazyBudgetVsActualBar data={trend} />
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  accent,
  isCount,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent: "primary" | "accent" | "destructive" | "muted";
  isCount?: boolean;
}) {
  const accentMap = {
    primary: "bg-primary/15 text-primary",
    accent: "bg-accent/15 text-accent",
    destructive: "bg-destructive/15 text-destructive",
    muted: "bg-secondary text-muted-foreground",
  };
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${accentMap[accent]}`}>
          {icon}
        </div>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight">
        {isCount ? value : formatCurrency(value)}
      </p>
    </Card>
  );
}
