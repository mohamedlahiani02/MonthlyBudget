"use client";

import * as React from "react";
import { Plus, ArrowLeftRight, Pencil, Trash2, Eye, Star, Landmark, Wallet } from "lucide-react";
import { api } from "@/lib/client-api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { AccountForm } from "@/components/accounts/account-form";
import { TransferForm } from "@/components/accounts/transfer-form";
import type { Account, AccountWithBalanceDTO } from "@/types";

interface AccountDetail {
  account: Account;
  expenses: { id: string; amount: number; description: string; date: string }[];
  incomes: { id: string; amount: number; description: string; date: string }[];
  transfersOut: { id: string; amount: number; date: string; toAccount: { label: string } }[];
  transfersIn: { id: string; amount: number; date: string; fromAccount: { label: string } }[];
}

const typeBadge = (t: string) =>
  t === "Banque" ? "accent" : t === "Caisse" ? "default" : "secondary";

export default function AccountsPage() {
  const { toast } = useToast();
  const [accounts, setAccounts] = React.useState<AccountWithBalanceDTO[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Account | null>(null);
  const [transferOpen, setTransferOpen] = React.useState(false);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<AccountDetail | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      setAccounts(await api.get<AccountWithBalanceDTO[]>("/api/accounts"));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const netWorth = accounts.filter((a) => a.isActive).reduce((s, a) => s + a.balance, 0);

  async function setDefault(id: string) {
    await api.put(`/api/accounts/${id}`, { isDefault: true });
    toast({ title: "Default account updated", variant: "success" });
    load();
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await api.del(`/api/accounts/${deleteId}`);
      toast({ title: "Account deleted", variant: "success" });
      setDeleteId(null);
      load();
    } catch (err) {
      setDeleteId(null);
      toast({
        title: "Cannot delete",
        description: (err as Error).message,
        variant: "destructive",
      });
    }
  }

  async function openDetail(id: string) {
    const data = await api.get<AccountDetail>(`/api/accounts/${id}`);
    setDetail(data);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Accounts</h1>
          <p className="text-sm text-muted-foreground">
            Manage your cash & bank accounts and move money between them.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setTransferOpen(true)} className="gap-2">
            <ArrowLeftRight className="h-4 w-4" /> Transfer
          </Button>
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" /> New account
          </Button>
        </div>
      </div>

      {/* Net worth */}
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Total balance (net worth)</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight">{formatCurrency(netWorth)}</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <Wallet className="h-6 w-6" />
          </div>
        </div>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : accounts.length === 0 ? (
            <EmptyState
              icon={Landmark}
              title="No accounts yet"
              description="Create your first cash or bank account."
              className="border-0"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-white/5 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="p-4 font-medium">Label</th>
                    <th className="p-4 font-medium">Type</th>
                    <th className="p-4 font-medium">Bank</th>
                    <th className="p-4 text-right font-medium">Balance</th>
                    <th className="p-4 text-center font-medium">Default</th>
                    <th className="p-4 text-center font-medium">Active</th>
                    <th className="p-4" />
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((a) => (
                    <tr key={a.id} className="border-b border-white/5 last:border-0 hover:bg-secondary/30">
                      <td className="p-4 font-medium">{a.label}</td>
                      <td className="p-4">
                        <Badge variant={typeBadge(a.type)}>{a.type}</Badge>
                      </td>
                      <td className="p-4 text-muted-foreground">{a.bankName ?? "—"}</td>
                      <td className="p-4 text-right font-semibold">{formatCurrency(a.balance)}</td>
                      <td className="p-4 text-center">
                        {a.isDefault ? (
                          <Star className="mx-auto h-4 w-4 fill-primary text-primary" />
                        ) : (
                          <button
                            onClick={() => setDefault(a.id)}
                            className="text-muted-foreground/50 hover:text-primary"
                            title="Set as default"
                          >
                            <Star className="mx-auto h-4 w-4" />
                          </button>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {a.isActive ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openDetail(a.id)} title="View">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditing(a);
                              setFormOpen(true);
                            }}
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteId(a.id)} title="Delete">
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

      {/* Create / edit */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit account" : "New account"}</DialogTitle>
          </DialogHeader>
          <AccountForm
            account={editing}
            onSaved={() => {
              setFormOpen(false);
              load();
            }}
            onCancel={() => setFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Transfer */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer between accounts</DialogTitle>
            <DialogDescription>Move money from one account to another.</DialogDescription>
          </DialogHeader>
          <TransferForm
            onSaved={() => {
              setTransferOpen(false);
              load();
            }}
            onCancel={() => setTransferOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Detail */}
      <Dialog open={detail !== null} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-lg">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle>{detail.account.label}</DialogTitle>
                <DialogDescription>
                  {detail.account.type}
                  {detail.account.bankName ? ` · ${detail.account.bankName}` : ""} · opening{" "}
                  {formatCurrency(detail.account.openingBalance)}
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-[50vh] space-y-4 overflow-y-auto pr-1">
                <DetailSection title="Recent expenses" rows={detail.expenses.map((e) => ({
                  id: e.id, label: e.description, date: e.date, amount: -e.amount,
                }))} />
                <DetailSection title="Recent income" rows={detail.incomes.map((i) => ({
                  id: i.id, label: i.description, date: i.date, amount: i.amount,
                }))} />
                <DetailSection title="Transfers out" rows={detail.transfersOut.map((t) => ({
                  id: t.id, label: `→ ${t.toAccount.label}`, date: t.date, amount: -t.amount,
                }))} />
                <DetailSection title="Transfers in" rows={detail.transfersIn.map((t) => ({
                  id: t.id, label: `← ${t.fromAccount.label}`, date: t.date, amount: t.amount,
                }))} />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete account?"
        description="Accounts with transactions can't be deleted — deactivate them instead."
        onConfirm={handleDelete}
      />
    </div>
  );
}

function DetailSection({
  title,
  rows,
}: {
  title: string;
  rows: { id: string; label: string; date: string; amount: number }[];
}) {
  if (rows.length === 0) return null;
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold text-muted-foreground">{title}</p>
      <ul className="divide-y divide-white/5">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center justify-between py-2 text-sm">
            <span className="min-w-0 flex-1 truncate">{r.label}</span>
            <span className="mx-3 text-xs text-muted-foreground">{formatDate(r.date)}</span>
            <span className={r.amount < 0 ? "text-destructive" : "text-primary"}>
              {r.amount < 0 ? "−" : "+"}
              {formatCurrency(Math.abs(r.amount))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
