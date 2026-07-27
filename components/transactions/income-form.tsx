"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { incomeSchema, type IncomeInput } from "@/lib/validations";
import { api } from "@/lib/client-api";
import { useAccounts } from "@/hooks/use-accounts";
import { toDateInputValue } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { IncomeWithAccount } from "@/types";

interface IncomeFormProps {
  income?: IncomeWithAccount | null;
  onSaved?: () => void;
  onCancel?: () => void;
}

export function IncomeForm({ income, onSaved, onCancel }: IncomeFormProps) {
  const { toast } = useToast();
  const { accounts, defaultAccount } = useAccounts();
  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<IncomeInput>({
    resolver: zodResolver(incomeSchema),
    defaultValues: {
      amount: income?.amount ?? undefined,
      description: income?.description ?? "",
      date: income ? new Date(income.date) : new Date(),
      accountId: income?.accountId ?? "",
    },
  });

  const accountId = watch("accountId");
  React.useEffect(() => {
    if (!accountId && defaultAccount) setValue("accountId", defaultAccount.id);
  }, [accountId, defaultAccount, setValue]);

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
      <div className="space-y-2">
        <Label>Account</Label>
        <Controller
          control={control}
          name="accountId"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.label}
                    {a.bankName ? ` · ${a.bankName}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.accountId && <p className="text-xs text-destructive">Please choose an account</p>}
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
