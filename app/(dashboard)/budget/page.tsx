"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Wallet, PiggyBank, TrendingDown, BarChart3 } from "lucide-react";
import { budgetSchema, type BudgetInput } from "@/lib/validations";
import { api } from "@/lib/client-api";
import { formatCurrency, MONTH_NAMES, monthName } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BudgetRing } from "@/components/dashboard/budget-ring";
import { WeeklyCapSection } from "@/components/budget/weekly-cap-section";
import { CategoryBudgetsSection } from "@/components/budget/category-budgets-section";
import { CarryoverSection } from "@/components/budget/carryover-section";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Budget, ExpenseWithCategory } from "@/types";

export default function BudgetPage() {
  const { toast } = useToast();
  const now = new Date();
  const [month, setMonth] = React.useState(now.getMonth() + 1);
  const [year, setYear] = React.useState(now.getFullYear());
  const [spent, setSpent] = React.useState(0);
  const [income, setIncome] = React.useState(0);
  const [loading, setLoading] = React.useState(true);

  const { register, handleSubmit, reset, watch, formState: { isSubmitting } } =
    useForm<BudgetInput>({
      resolver: zodResolver(budgetSchema),
      defaultValues: { month, year, monthlyBudget: 0, savingGoal: 0 },
    });

  const monthlyBudget = watch("monthlyBudget") || 0;
  const savingGoal = watch("savingGoal") || 0;

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [budget, expenses, incomes] = await Promise.all([
        api.get<Budget | null>(`/api/budget?month=${month}&year=${year}`),
        api.get<ExpenseWithCategory[]>(`/api/expenses?month=${month}&year=${year}`),
        api.get<{ amount: number }[]>(`/api/income?month=${month}&year=${year}`),
      ]);
      reset({
        month,
        year,
        monthlyBudget: budget?.monthlyBudget ?? 0,
        savingGoal: budget?.savingGoal ?? 0,
      });
      setSpent(expenses.reduce((s, e) => s + e.amount, 0));
      setIncome(incomes.reduce((s, i) => s + i.amount, 0));
    } finally {
      setLoading(false);
    }
  }, [month, year, reset]);

  React.useEffect(() => {
    load();
  }, [load]);

  async function onSubmit(values: BudgetInput) {
    try {
      await api.post("/api/budget", { ...values, month, year });
      toast({ title: "Budget saved", variant: "success" });
      load();
    } catch (err) {
      toast({ title: "Failed to save", description: (err as Error).message, variant: "destructive" });
    }
  }

  const remaining = monthlyBudget - spent;
  const utilization = monthlyBudget > 0 ? (spent / monthlyBudget) * 100 : 0;
  const savings = income - spent;
  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - i);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Budget</h1>
          <p className="text-sm text-muted-foreground">Set a monthly limit and saving goal.</p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
            <SelectTrigger className="w-32 flex-1 sm:w-36 sm:flex-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTH_NAMES.map((name, i) => (
                <SelectItem key={i} value={String(i + 1)}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-24 sm:w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button asChild variant="outline" className="gap-2">
            <Link href={`/budget/report?month=${month}&year=${year}`}>
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Report</span>
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              {monthName(month)} {year} budget
            </CardTitle>
            <CardDescription>One budget per month. Saving is updated automatically.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="monthlyBudget">Monthly budget (DT)</Label>
                  <Input id="monthlyBudget" type="number" step="0.01" {...register("monthlyBudget")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="savingGoal">Saving goal (DT)</Label>
                  <Input id="savingGoal" type="number" step="0.01" {...register("savingGoal")} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <StatBox icon={TrendingDown} label="Spent" value={spent} accent="destructive" />
                <StatBox
                  icon={Wallet}
                  label="Remaining"
                  value={remaining}
                  accent={remaining < 0 ? "destructive" : "primary"}
                />
                <StatBox
                  icon={PiggyBank}
                  label="Savings"
                  value={savings}
                  accent={savings >= savingGoal ? "primary" : "muted"}
                />
              </div>

              <Button type="submit" disabled={isSubmitting || loading}>
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />} Save budget
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Utilization</CardTitle>
            <CardDescription>Spent vs budget</CardDescription>
          </CardHeader>
          <CardContent>
            <BudgetRing utilization={utilization} spent={spent} budget={monthlyBudget} />
            {savingGoal > 0 && (
              <p className="mt-4 text-center text-sm text-muted-foreground">
                Saving goal: {formatCurrency(savingGoal)} ·{" "}
                {savings >= savingGoal ? (
                  <span className="text-primary">reached 🎉</span>
                ) : (
                  <span>{formatCurrency(Math.max(0, savingGoal - savings))} to go</span>
                )}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <CarryoverSection month={month} year={year} onChanged={load} />

      <WeeklyCapSection />

      <CategoryBudgetsSection month={month} year={year} />
    </div>
  );
}

function StatBox({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  accent: "primary" | "destructive" | "muted";
}) {
  const color =
    accent === "primary" ? "text-primary" : accent === "destructive" ? "text-destructive" : "text-foreground";
  return (
    <div className="rounded-xl border border-white/10 bg-secondary/30 p-4">
      <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <p className={`text-lg font-semibold ${color}`}>{formatCurrency(value)}</p>
    </div>
  );
}
