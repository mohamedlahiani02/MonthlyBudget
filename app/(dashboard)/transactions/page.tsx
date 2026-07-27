"use client";

import * as React from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { api } from "@/lib/client-api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useCategories } from "@/hooks/use-categories";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ExpenseForm } from "@/components/transactions/expense-form";
import { IncomeForm } from "@/components/transactions/income-form";
import { TransactionFilters, type Filters } from "@/components/transactions/transaction-filters";
import type { ExpenseWithCategory, Income } from "@/types";

const EMPTY_FILTERS: Filters = {
  q: "",
  categoryId: "",
  subcategoryId: "",
  paymentMethod: "",
  month: "",
  year: "",
};

export default function TransactionsPage() {
  const { toast } = useToast();
  const { categories } = useCategories();
  const [tab, setTab] = React.useState("expenses");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
          <p className="text-sm text-muted-foreground">Search, filter and manage your money.</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="income">Income</TabsTrigger>
        </TabsList>
        <TabsContent value="expenses">
          <ExpensesTab categories={categories} toast={toast} />
        </TabsContent>
        <TabsContent value="income">
          <IncomeTab toast={toast} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------------- Expenses ---------------- */

function ExpensesTab({
  categories,
  toast,
}: {
  categories: ReturnType<typeof useCategories>["categories"];
  toast: ReturnType<typeof useToast>["toast"];
}) {
  const [filters, setFilters] = React.useState<Filters>(EMPTY_FILTERS);
  const [items, setItems] = React.useState<ExpenseWithCategory[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ExpenseWithCategory | null>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.q) params.set("q", filters.q);
      if (filters.categoryId) params.set("categoryId", filters.categoryId);
      if (filters.subcategoryId) params.set("subcategoryId", filters.subcategoryId);
      if (filters.paymentMethod) params.set("paymentMethod", filters.paymentMethod);
      if (filters.year) params.set("year", filters.year);
      if (filters.month) params.set("month", filters.month);
      const data = await api.get<ExpenseWithCategory[]>(`/api/expenses?${params.toString()}`);
      setItems(data);
    } catch (err) {
      toast({ title: "Failed to load", description: (err as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [filters, toast]);

  React.useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function handleDelete() {
    if (!deleteId) return;
    await api.del(`/api/expenses/${deleteId}`);
    toast({ title: "Expense deleted", variant: "success" });
    setDeleteId(null);
    load();
  }

  const total = items.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-4">
      <TransactionFilters filters={filters} onChange={setFilters} categories={categories} />

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {items.length} results · Total <span className="font-medium text-foreground">{formatCurrency(total)}</span>
        </p>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Add expense
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              title="No expenses found"
              description="Try adjusting your filters or add a new expense."
              className="border-0"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-white/5 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="p-4 font-medium">Date</th>
                    <th className="p-4 font-medium">Description</th>
                    <th className="p-4 font-medium">Category</th>
                    <th className="p-4 font-medium">Method</th>
                    <th className="p-4 text-right font-medium">Amount</th>
                    <th className="p-4" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((e) => (
                    <tr key={e.id} className="border-b border-white/5 last:border-0 hover:bg-secondary/30">
                      <td className="whitespace-nowrap p-4 text-muted-foreground">{formatDate(e.date)}</td>
                      <td className="p-4 font-medium">{e.description}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Badge variant={e.subcategory.category.type === "Fixed" ? "accent" : "secondary"}>
                            {e.subcategory.category.name}
                          </Badge>
                          <span className="text-muted-foreground">{e.subcategory.name}</span>
                        </div>
                      </td>
                      <td className="p-4 text-muted-foreground">{e.paymentMethod}</td>
                      <td className="p-4 text-right font-semibold">{formatCurrency(e.amount)}</td>
                      <td className="p-4">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditing(e);
                              setFormOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteId(e.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit expense" : "Add expense"}</DialogTitle>
          </DialogHeader>
          <ExpenseForm
            expense={editing}
            onSaved={() => {
              setFormOpen(false);
              load();
            }}
            onCancel={() => setFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete expense?"
        description="This will permanently remove the expense and update your KPIs."
        onConfirm={handleDelete}
      />
    </div>
  );
}

/* ---------------- Income ---------------- */

function IncomeTab({ toast }: { toast: ReturnType<typeof useToast>["toast"] }) {
  const [items, setItems] = React.useState<Income[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Income | null>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<Income[]>("/api/income");
      setItems(data);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  async function handleDelete() {
    if (!deleteId) return;
    await api.del(`/api/income/${deleteId}`);
    toast({ title: "Income deleted", variant: "success" });
    setDeleteId(null);
    load();
  }

  const total = items.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {items.length} entries · Total <span className="font-medium text-foreground">{formatCurrency(total)}</span>
        </p>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Add income
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <EmptyState title="No income yet" description="Add your salary or other income." className="border-0" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-white/5 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="p-4 font-medium">Date</th>
                    <th className="p-4 font-medium">Description</th>
                    <th className="p-4 text-right font-medium">Amount</th>
                    <th className="p-4" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((e) => (
                    <tr key={e.id} className="border-b border-white/5 last:border-0 hover:bg-secondary/30">
                      <td className="whitespace-nowrap p-4 text-muted-foreground">{formatDate(e.date)}</td>
                      <td className="p-4 font-medium">{e.description}</td>
                      <td className="p-4 text-right font-semibold text-primary">+{formatCurrency(e.amount)}</td>
                      <td className="p-4">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditing(e);
                              setFormOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteId(e.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit income" : "Add income"}</DialogTitle>
          </DialogHeader>
          <IncomeForm
            income={editing}
            onSaved={() => {
              setFormOpen(false);
              load();
            }}
            onCancel={() => setFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete income?"
        description="This will permanently remove the income entry."
        onConfirm={handleDelete}
      />
    </div>
  );
}
