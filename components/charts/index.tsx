"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  Area,
  AreaChart,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import { EmptyState } from "@/components/shared/empty-state";
import type { MonthlyPoint } from "@/lib/finance";

const PALETTE = [
  "#10b981",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#6366f1",
  "#84cc16",
];

const AXIS = { stroke: "hsl(215 20% 65%)", fontSize: 12 };
const GRID = "hsl(217 33% 24%)";

function TooltipBox({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-popover/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      {label && <p className="mb-1 font-medium">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color ?? p.fill }}>
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  );
}

export function CategoryPie({ data }: { data: { name: string; value: number }[] }) {
  if (!data.length) return <EmptyState title="No data" description="Log expenses to see the breakdown." />;
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} stroke="transparent" />
          ))}
        </Pie>
        <Tooltip content={<TooltipBox />} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function FixedVsVariablePie({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total <= 0) return <EmptyState title="No data" description="Log expenses to compare fixed vs variable." />;
  const colors = ["#3b82f6", "#10b981"];
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" outerRadius={100} label>
          {data.map((_, i) => (
            <Cell key={i} fill={colors[i % colors.length]} stroke="transparent" />
          ))}
        </Pie>
        <Tooltip content={<TooltipBox />} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function MonthlyBar({ data }: { data: MonthlyPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey="month" tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} width={40} />
        <Tooltip content={<TooltipBox />} cursor={{ fill: "hsl(217 33% 24% / 0.4)" }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="income" name="Income" fill="#10b981" radius={[6, 6, 0, 0]} />
        <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function BudgetVsActualBar({
  data,
}: {
  data: { label: string; budgeted: number; spent: number }[];
}) {
  const total = data.reduce((s, d) => s + d.budgeted + d.spent, 0);
  if (total <= 0)
    return <EmptyState title="No data" description="Set category budgets to see the trend." />;
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} width={40} />
        <Tooltip content={<TooltipBox />} cursor={{ fill: "hsl(217 33% 24% / 0.4)" }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="budgeted" name="Budgeted" fill="#3b82f6" radius={[6, 6, 0, 0]} />
        <Bar dataKey="spent" name="Spent" fill="#10b981" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SavingsLine({ data }: { data: MonthlyPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="savingsFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey="month" tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} width={40} />
        <Tooltip content={<TooltipBox />} />
        <Area
          type="monotone"
          dataKey="savings"
          name="Savings"
          stroke="#10b981"
          strokeWidth={2}
          fill="url(#savingsFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function SpendingLine({ data }: { data: MonthlyPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey="month" tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} width={40} />
        <Tooltip content={<TooltipBox />} />
        <Line
          type="monotone"
          dataKey="expenses"
          name="Spending"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
