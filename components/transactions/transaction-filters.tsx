"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PAYMENT_METHODS } from "@/lib/validations";
import { MONTH_NAMES } from "@/lib/utils";
import { useAccounts } from "@/hooks/use-accounts";
import type { CategoryWithSubs } from "@/types";

export interface Filters {
  q: string;
  categoryId: string;
  subcategoryId: string;
  paymentMethod: string;
  accountId: string;
  month: string;
  year: string;
}

interface Props {
  filters: Filters;
  onChange: (f: Filters) => void;
  categories: CategoryWithSubs[];
}

const ALL = "all";

export function TransactionFilters({ filters, onChange, categories }: Props) {
  const { accounts } = useAccounts();
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });
  const selectedCat = categories.find((c) => c.id === filters.categoryId);
  const years = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-7">
      <div className="relative col-span-2 md:col-span-3 lg:col-span-2">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search description…"
          className="pl-9"
          value={filters.q}
          onChange={(e) => set({ q: e.target.value })}
        />
      </div>

      <Select
        value={filters.categoryId || ALL}
        onValueChange={(v) => set({ categoryId: v === ALL ? "" : v, subcategoryId: "" })}
      >
        <SelectTrigger>
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All categories</SelectItem>
          {categories.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.subcategoryId || ALL}
        onValueChange={(v) => set({ subcategoryId: v === ALL ? "" : v })}
        disabled={!selectedCat}
      >
        <SelectTrigger>
          <SelectValue placeholder="Subcategory" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All subcategories</SelectItem>
          {selectedCat?.subcategories.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.paymentMethod || ALL}
        onValueChange={(v) => set({ paymentMethod: v === ALL ? "" : v })}
      >
        <SelectTrigger>
          <SelectValue placeholder="Payment" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All methods</SelectItem>
          {PAYMENT_METHODS.map((m) => (
            <SelectItem key={m} value={m}>
              {m}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.accountId || ALL}
        onValueChange={(v) => set({ accountId: v === ALL ? "" : v })}
      >
        <SelectTrigger>
          <SelectValue placeholder="Account" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All accounts</SelectItem>
          {accounts.map((a) => (
            <SelectItem key={a.id} value={a.id}>
              {a.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex gap-2">
        <Select value={filters.month || ALL} onValueChange={(v) => set({ month: v === ALL ? "" : v })}>
          <SelectTrigger>
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All</SelectItem>
            {MONTH_NAMES.map((name, i) => (
              <SelectItem key={i} value={String(i + 1)}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filters.year || ALL} onValueChange={(v) => set({ year: v === ALL ? "" : v })}>
          <SelectTrigger>
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All</SelectItem>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
