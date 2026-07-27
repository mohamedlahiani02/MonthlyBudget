"use client";

import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ExpenseForm } from "@/components/transactions/expense-form";
import { useUI } from "@/components/shared/ui-context";

export function QuickAddExpense() {
  const { quickAddOpen, setQuickAddOpen } = useUI();
  const router = useRouter();

  return (
    <Dialog open={quickAddOpen} onOpenChange={setQuickAddOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Quick add expense</DialogTitle>
          <DialogDescription>Log a new expense in seconds.</DialogDescription>
        </DialogHeader>
        <ExpenseForm
          onSaved={() => {
            setQuickAddOpen(false);
            router.refresh();
          }}
          onCancel={() => setQuickAddOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
