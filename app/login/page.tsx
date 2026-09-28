"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { Lock, Loader2, Wallet } from "lucide-react";
import { loginSchema, type LoginInput } from "@/lib/validations";
import { api } from "@/lib/client-api";
import { safeNextPath } from "@/lib/safe-redirect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginInput) {
    try {
      await api.post("/api/auth/login", values);
      toast({ title: "Welcome back", variant: "success" });
      const target =
        safeNextPath(new URLSearchParams(window.location.search).get("next")) ?? "/";
      if (target.startsWith("/oauth/")) {
        window.location.assign(target);
        return;
      }
      router.replace(target);
      router.refresh();
    } catch (err) {
      toast({
        title: "Login failed",
        description: (err as Error).message,
        variant: "destructive",
      });
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="glass-card w-full max-w-sm p-8"
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <Wallet className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-semibold">Finance Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your password to unlock
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                autoFocus
                placeholder="••••••••"
                className="pl-9"
                {...register("password")}
              />
            </div>
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Unlocking…
              </>
            ) : (
              "Unlock"
            )}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
