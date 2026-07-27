"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { expenseSchema, type ExpenseInput, PAYMENT_METHODS } from "@/lib/validations";
import { api } from "@/lib/client-api";
import { useCategories } from "@/hooks/use-categories";
import { toDateInputValue } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { ExpenseWithCategory } from "@/types";

interface ExpenseFormProps {
  expense?: ExpenseWithCategory | null;
  onSaved?: () => void;
  onCancel?: () => void;
}

export function ExpenseForm({ expense, onSaved, onCancel }: ExpenseFormProps) {
  const { toast } = useToast();
  const { categories, loading } = useCategories();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseInput>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      amount: expense?.amount ?? undefined,
      description: expense?.description ?? "",
      date: expense ? new Date(expense.date) : new Date(),
      paymentMethod: expense?.paymentMethod ?? "Card",
      subcategoryId: expense?.subcategoryId ?? "",
    },
  });

  async function onSubmit(values: ExpenseInput) {
    try {
      const payload = { ...values, date: new Date(values.date).toISOString() };
      if (expense) {
        await api.put(`/api/expenses/${expense.id}`, payload);
        toast({ title: "Expense updated", variant: "success" });
      } else {
        await api.post("/api/expenses", payload);
        toast({ title: "Expense added", variant: "success" });
      }
      onSaved?.();
    } catch (err) {
      toast({
        title: "Could not save expense",
        description: (err as Error).message,
        variant: "destructive",
      });
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="amount">Amount (DT)</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            placeholder="0.00"
            {...register("amount")}
          />
          {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="date">Date</Label>
          <Controller
            control={control}
            name="date"
            render={({ field }) => (
              <Input
                id="date"
                type="date"
                value={field.value ? toDateInputValue(field.value) : ""}
                onChange={(e) => field.onChange(new Date(e.target.value))}
              />
            )}
          />
          {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input id="description" placeholder="e.g. Coffee at Café" {...register("description")} />
        {errors.description && (
          <p className="text-xs text-destructive">{errors.description.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Subcategory</Label>
          <Controller
            control={control}
            name="subcategoryId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder={loading ? "Loading…" : "Select"} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectGroup key={cat.id}>
                      <SelectLabel>
                        {cat.name} · {cat.type}
                      </SelectLabel>
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
          {errors.subcategoryId && (
            <p className="text-xs text-destructive">Please choose a subcategory</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Payment method</Label>
          <Controller
            control={control}
            name="paymentMethod"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {expense ? "Save changes" : "Add expense"}
        </Button>
      </div>
    </form>
  );
}
