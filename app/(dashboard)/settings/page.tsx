"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTheme } from "next-themes";
import {
  KeyRound,
  Download,
  Upload,
  Database,
  Loader2,
  Moon,
  FileSpreadsheet,
} from "lucide-react";
import { changePasswordSchema, type ChangePasswordInput } from "@/lib/validations";
import { api } from "@/lib/client-api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Security, data and appearance.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PasswordCard />
        <AppearanceCard />
        <DataCard />
      </div>
    </div>
  );
}

function PasswordCard() {
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({ resolver: zodResolver(changePasswordSchema) });

  async function onSubmit(values: ChangePasswordInput) {
    try {
      await api.post("/api/settings/password", values);
      toast({ title: "Password updated", variant: "success" });
      reset();
    } catch (err) {
      toast({ title: "Failed", description: (err as Error).message, variant: "destructive" });
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-primary" />
          <CardTitle>Change password</CardTitle>
        </div>
        <CardDescription>Update the password used to unlock the dashboard.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current password</Label>
            <Input id="currentPassword" type="password" {...register("currentPassword")} />
            {errors.currentPassword && (
              <p className="text-xs text-destructive">{errors.currentPassword.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">New password</Label>
            <Input id="newPassword" type="password" {...register("newPassword")} />
            {errors.newPassword && (
              <p className="text-xs text-destructive">{errors.newPassword.message}</p>
            )}
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />} Update password
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function AppearanceCard() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const isDark = theme !== "light";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Moon className="h-4 w-4 text-primary" />
          <CardTitle>Appearance</CardTitle>
        </div>
        <CardDescription>Toggle between dark and light mode.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-secondary/30 p-4">
          <div>
            <p className="text-sm font-medium">Dark mode</p>
            <p className="text-xs text-muted-foreground">
              {mounted ? (isDark ? "Enabled" : "Disabled") : "…"}
            </p>
          </div>
          <Switch
            checked={isDark}
            onCheckedChange={(v) => setTheme(v ? "dark" : "light")}
            aria-label="Toggle dark mode"
          />
        </div>
      </CardContent>
    </Card>
  );
}

function DataCard() {
  const { toast } = useToast();
  const [importing, setImporting] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const res = await fetch("/api/settings/import", { method: "POST", body: text });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      toast({
        title: "Import complete",
        description: `${data.imported} imported, ${data.skipped} skipped.`,
        variant: "success",
      });
    } catch (err) {
      toast({ title: "Import failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-primary" />
          <CardTitle>Data</CardTitle>
        </div>
        <CardDescription>Export your data or import expenses from a CSV file.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <a href="/api/settings/export?format=csv" download>
            <Button variant="outline" className="w-full justify-start gap-2">
              <FileSpreadsheet className="h-4 w-4" /> Export CSV
            </Button>
          </a>
          <a href="/api/settings/export?format=json" download>
            <Button variant="outline" className="w-full justify-start gap-2">
              <Download className="h-4 w-4" /> Export database (JSON)
            </Button>
          </a>
          <div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleImport}
            />
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => fileRef.current?.click()}
              disabled={importing}
            >
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Import CSV
            </Button>
          </div>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          CSV columns: <code>date, amount, description, paymentMethod, category, categoryType, subcategory</code>.
          Missing categories are created automatically.
        </p>
      </CardContent>
    </Card>
  );
}
