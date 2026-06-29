"use client";

import { FormEvent, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PaymentMode } from "@prisma/client";
import { Save } from "lucide-react";
import { updatePayment } from "@/app/(app)/payment/actions";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import { Textarea } from "@/components/ui/textarea";
import type { SelectOption } from "@/lib/options";
import type { EditablePayment } from "@/lib/transactions/types";

export function EditPaymentDialog({
  open,
  onOpenChange,
  payment,
  customers
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: EditablePayment | null;
  customers: SelectOption[];
}) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(PaymentMode.CASH);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!payment || !open) {
      return;
    }
    setCustomerId(payment.customerId);
    setPaymentDate(payment.paymentDate);
    setAmount(String(payment.amount));
    setPaymentMode(payment.paymentMode);
    setNotes(payment.notes);
    setError("");
  }, [payment, open]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!payment) {
      return;
    }
    setError("");
    startTransition(() => {
      void (async () => {
        const result = await updatePayment(payment.id, {
          customerId,
          paymentDate,
          amount: Number(amount || 0),
          paymentMode,
          notes
        });
        if (!result.ok) {
          setError(result.error ?? "Unable to update payment.");
          return;
        }
        onOpenChange(false);
        router.refresh();
      })();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Payment</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <SearchableSelect label="Customer" options={customers} value={customerId} onChange={setCustomerId} placeholder="Search customer" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-payment-date">Payment Date</Label>
              <Input id="edit-payment-date" type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-payment-amount">Amount</Label>
              <Input id="edit-payment-amount" inputMode="decimal" type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-payment-mode">Payment Mode</Label>
            <SelectNative id="edit-payment-mode" value={paymentMode} onChange={(event) => setPaymentMode(event.target.value as PaymentMode)}>
              <option value={PaymentMode.CASH}>Cash</option>
              <option value={PaymentMode.UPI}>UPI</option>
              <option value={PaymentMode.BANK}>Bank</option>
              <option value={PaymentMode.CHEQUE}>Cheque</option>
            </SelectNative>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-payment-notes">Notes</Label>
            <Textarea id="edit-payment-notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} />
          </div>
          {error ? <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
          <Button className="w-full" size="lg" disabled={pending}>
            <Save className="h-5 w-5" />
            {pending ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}