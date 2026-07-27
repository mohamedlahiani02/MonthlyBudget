"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { accountSchema, type AccountInput, ACCOUNT_TYPES } from "@/lib/validations";
import { api } from "@/lib/client-api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Account } from "@/types";

interface AccountFormProps {
  account?: Account | null;
  onSaved?: () => void;
  onCancel?: () => void;
}

export function AccountForm({ account, onSaved, onCancel }: AccountFormProps) {
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AccountInput>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      label: account?.label ?? "",
      type: account?.type ?? "Caisse",
      bankName: account?.bankName ?? "",
      openingBalance: account?.openingBalance ?? 0,
      isDefault: account?.isDefault ?? false,
      isActive: account?.isActive ?? true,
    },
  });

  const type = watch("type");

  async function onSubmit(values: AccountInput) {
    try {
      if (account) {
        await api.put(`/api/accounts/${account.id}`, values);
        toast({ title: "Account updated", variant: "success" });
      } else {
        await api.post("/api/accounts", values);
        toast({ title: "Account created", variant: "success" });
      }
      onSaved?.();
    } catch (err) {
      toast({ title: "Could not save", description: (err as Error).message, variant: "destructive" });
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="label">Label</Label>
        <Input id="label" placeholder="e.g. Compte BIAT courant" {...register("label")} />
        {errors.label && <p className="text-xs text-destructive">{errors.label.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Type</Label>
          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="openingBalance">Opening balance (DT)</Label>
          <Input id="openingBalance" type="number" step="0.01" {...register("openingBalance")} />
        </div>
      </div>

      {type === "Banque" && (
        <div className="space-y-2">
          <Label htmlFor="bankName">Bank</Label>
          <Input id="bankName" placeholder="e.g. BIAT, Attijari Bank" {...register("bankName")} />
        </div>
      )}

      <div className="flex items-center gap-6">
        <Controller
          control={control}
          name="isDefault"
          render={({ field }) => (
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={field.value} onCheckedChange={field.onChange} /> Default account
            </label>
          )}
        />
        <Controller
          control={control}
          name="isActive"
          render={({ field }) => (
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={field.value} onCheckedChange={field.onChange} /> Active
            </label>
          )}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {account ? "Save changes" : "Create account"}
        </Button>
      </div>
    </form>
  );
}
