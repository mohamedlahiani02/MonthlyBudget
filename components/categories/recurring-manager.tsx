"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, Repeat, Loader2 } from "lucide-react";
import { recurringExpenseSchema, type RecurringExpenseInput } from "@/lib/validations";
import { api } from "@/lib/client-api";
import { formatCurrency } from "@/lib/utils";
import { useCategories } from "@/hooks/use-categories";
import { useAccounts } from "@/hooks/use-accounts";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RecurringWithCategory } from "@/types";

export function RecurringManager() {
  const { toast } = useToast();
  const { categories } = useCategories();
  const { accounts, defaultAccount } = useAccounts();
  const [items, setItems] = React.useState<RecurringWithCategory[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  const { register, handleSubmit, control, reset, setValue, watch, formState: { errors, isSubmitting } } =
    useForm<RecurringExpenseInput>({
      resolver: zodResolver(recurringExpenseSchema),
      defaultValues: {
        amount: undefined,
        description: "",
        dayOfMonth: 1,
        subcategoryId: "",
        accountId: "",
        active: true,
      },
    });

  const accountId = watch("accountId");
  React.useEffect(() => {
    if (!accountId && defaultAccount) setValue("accountId", defaultAccount.id);
  }, [accountId, defaultAccount, setValue]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      setItems(await api.get<RecurringWithCategory[]>("/api/recurring"));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  async function onSubmit(values: RecurringExpenseInput) {
    try {
      await api.post("/api/recurring", values);
      toast({ title: "Recurring expense added", variant: "success" });
      reset({
        amount: undefined,
        description: "",
        dayOfMonth: 1,
        subcategoryId: "",
        accountId: defaultAccount?.id ?? "",
        active: true,
      });
      load();
    } catch (err) {
      toast({ title: "Failed", description: (err as Error).message, variant: "destructive" });
    }
  }

  async function toggle(item: RecurringWithCategory) {
    await api.put(`/api/recurring/${item.id}`, { active: !item.active });
    load();
  }

  async function remove() {
    if (!deleteId) return;
    await api.del(`/api/recurring/${deleteId}`);
    toast({ title: "Deleted", variant: "success" });
    setDeleteId(null);
    load();
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Repeat className="h-4 w-4 text-primary" />
          <CardTitle>Recurring expenses</CardTitle>
        </div>
        <CardDescription>
          Auto-generated each month (e.g. STEG 180 DT). They appear automatically when you open the app in a new month.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-3 sm:grid-cols-6">
          <div className="space-y-1.5">
            <Label htmlFor="r-amount">Amount</Label>
            <Input id="r-amount" type="number" step="0.01" placeholder="180" {...register("amount")} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="r-desc">Description</Label>
            <Input id="r-desc" placeholder="STEG bill" {...register("description")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="r-day">Day</Label>
            <Input id="r-day" type="number" min={1} max={28} {...register("dayOfMonth")} />
          </div>
          <div className="space-y-1.5">
            <Label>Subcategory</Label>
            <Controller
              control={control}
              name="subcategoryId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectGroup key={cat.id}>
                        <SelectLabel>{cat.name}</SelectLabel>
                        {cat.subcategories.map((sub) => (
                          <SelectItem key={sub.id} value={sub.id}>
                            {sub.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Account</Label>
            <Controller
              control={control}
              name="accountId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="sm:col-span-6">
            {(errors.subcategoryId || errors.accountId) && (
              <p className="mb-2 text-xs text-destructive">Choose a subcategory and an account</p>
            )}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add recurring
            </Button>
          </div>
        </form>

        {loading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <EmptyState icon={Repeat} title="No recurring expenses" description="Add fixed monthly bills above." />
        ) : (
          <ul className="divide-y divide-white/5">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {item.description || item.subcategory.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.subcategory.category.name} · {item.subcategory.name} · day {item.dayOfMonth}
                  </p>
                </div>
                <span className="text-sm font-semibold">{formatCurrency(item.amount)}</span>
                <Switch checked={item.active} onCheckedChange={() => toggle(item)} aria-label="Toggle active" />
                <Button variant="ghost" size="icon" onClick={() => setDeleteId(item.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete recurring expense?"
        description="Future months will no longer auto-generate this expense. Already generated expenses remain."
        onConfirm={remove}
      />
    </Card>
  );
}
