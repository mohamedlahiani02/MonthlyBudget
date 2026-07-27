"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, ArrowRight } from "lucide-react";
import { transferSchema, type TransferInput } from "@/lib/validations";
import { api } from "@/lib/client-api";
import { toDateInputValue } from "@/lib/utils";
import { useAccounts } from "@/hooks/use-accounts";
import { useToast } from "@/hooks/use-toast";
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

export function TransferForm({
  onSaved,
  onCancel,
}: {
  onSaved?: () => void;
  onCancel?: () => void;
}) {
  const { toast } = useToast();
  const { accounts } = useAccounts();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<TransferInput>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      amount: undefined,
      description: "",
      date: new Date(),
      fromAccountId: "",
      toAccountId: "",
    },
  });

  async function onSubmit(values: TransferInput) {
    try {
      await api.post("/api/transfers", { ...values, date: new Date(values.date).toISOString() });
      toast({ title: "Transfer recorded", variant: "success" });
      onSaved?.();
    } catch (err) {
      toast({ title: "Could not transfer", description: (err as Error).message, variant: "destructive" });
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_auto_1fr]">
        <div className="space-y-2">
          <Label>From</Label>
          <Controller
            control={control}
            name="fromAccountId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Source" />
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
        <ArrowRight className="mb-3 hidden h-4 w-4 text-muted-foreground sm:block" />
        <div className="space-y-2">
          <Label>To</Label>
          <Controller
            control={control}
            name="toAccountId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Destination" />
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
      </div>
      {errors.toAccountId && (
        <p className="text-xs text-destructive">{errors.toAccountId.message}</p>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="t-amount">Amount (DT)</Label>
          <Input id="t-amount" type="number" step="0.01" {...register("amount")} />
          {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="t-date">Date</Label>
          <Controller
            control={control}
            name="date"
            render={({ field }) => (
              <Input
                id="t-date"
                type="date"
                value={field.value ? toDateInputValue(field.value) : ""}
                onChange={(e) => field.onChange(new Date(e.target.value))}
              />
            )}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="t-desc">Description</Label>
        <Input id="t-desc" placeholder="e.g. Cash withdrawal" {...register("description")} />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />} Transfer
        </Button>
      </div>
    </form>
  );
}
