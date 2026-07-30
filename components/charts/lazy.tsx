"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const fallback = <Skeleton className="h-[300px] w-full" />;

export const LazyCategoryPie = dynamic(
  () => import("@/components/charts").then((m) => m.CategoryPie),
  { ssr: false, loading: () => fallback }
);
export const LazyFixedVsVariablePie = dynamic(
  () => import("@/components/charts").then((m) => m.FixedVsVariablePie),
  { ssr: false, loading: () => fallback }
);
export const LazyMonthlyBar = dynamic(
  () => import("@/components/charts").then((m) => m.MonthlyBar),
  { ssr: false, loading: () => fallback }
);
export const LazySavingsLine = dynamic(
  () => import("@/components/charts").then((m) => m.SavingsLine),
  { ssr: false, loading: () => fallback }
);
export const LazySpendingLine = dynamic(
  () => import("@/components/charts").then((m) => m.SpendingLine),
  { ssr: false, loading: () => fallback }
);
export const LazyBudgetVsActualBar = dynamic(
  () => import("@/components/charts").then((m) => m.BudgetVsActualBar),
  { ssr: false, loading: () => fallback }
);
