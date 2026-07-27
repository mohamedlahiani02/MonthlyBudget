"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { incomeSchema, type IncomeInput } from "@/lib/validations";
import { api } from "@/lib/client-api";
import { toDateInputValue } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { Income } from "@/types";

interface IncomeFormProps {
  income?: Income | null;
  onSaved?: () => void;
  onCancel?: () => void;
}

export function IncomeForm({ income, onSaved, onCancel }: IncomeFormProps) {
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<IncomeInput>({
    resolver: zodResolver(incomeSchema),
    defaultValues: {
      amount: income?.amount ?? undefined,
      description: income?.description ?? "",
      date: income ? new Date(income.date) : new Date(),
    },
  });

  async function onSubmit(values: IncomeInput) {
    try {
      const payload = { ...values, date: new Date(values.date).toISOString() };
      if (income) {
        await api.put(`/api/income/${income.id}`, payload);
        toast({ title: "Income updated", variant: "success" });
      } else {
        await api.post("/api/income", payload);
        toast({ title: "Income added", variant: "success" });
      }
      onSaved?.();
    } catch (err) {
      toast({
        title: "Could not save income",
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
          <Input id="amount" type="number" step="0.01" placeholder="0.00" {...register("amount")} />
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
        <Input id="description" placeholder="e.g. Monthly salary" {...register("description")} />
        {errors.description && (
          <p className="text-xs text-destructive">{errors.description.message}</p>
        )}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {income ? "Save changes" : "Add income"}
        </Button>
      </div>
    </form>
  );
}
