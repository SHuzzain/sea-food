"use client";

import { PaymentMode } from "@prisma/client";
import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { createSupplierPayment, type SupplierPaymentPayload } from "@/app/(app)/payment/supplier-actions";
import { QuickAddSupplierDialog } from "@/components/forms/quick-add-dialogs";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { SupplierPaymentReceiptActions } from "@/components/transactions/supplier-payment-receipt-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import { Textarea } from "@/components/ui/textarea";
import type { SelectOption } from "@/lib/options";
import type { BusinessProfile, SupplierPaymentReceiptDocument } from "@/lib/documents/types";
import { DEFAULT_BUSINESS_PROFILE } from "@/lib/documents/types";
import { formatRupee, toMoney } from "@/lib/utils";

export function SupplierPaymentForm({
  suppliers,
  today,
  profile = DEFAULT_BUSINESS_PROFILE
}: {
  suppliers: SelectOption[];
  today: string;
  profile?: BusinessProfile;
}) {
  const router = useRouter();
  const [supplierOptions, setSupplierOptions] = useState(suppliers);
  const [supplierId, setSupplierId] = useState("");
  const [paymentDate, setPaymentDate] = useState(today);
  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(PaymentMode.CASH);
  const [notes, setNotes] = useState("");
  const [quickSupplierOpen, setQuickSupplierOpen] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [savedReceipt, setSavedReceipt] = useState<SupplierPaymentReceiptDocument | null>(null);
  const [pending, startTransition] = useTransition();

  const selectedSupplier = supplierOptions.find((supplier) => supplier.id === supplierId);
  const previousBalance = selectedSupplier?.balance ?? 0;
  const currentBalance = previousBalance - toMoney(amount);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSavedReceipt(null);
    const payload: SupplierPaymentPayload = {
      supplierId,
      paymentDate,
      amount: Number(amount || 0),
      paymentMode,
      notes
    };

    startTransition(() => {
      void (async () => {
        const result = await createSupplierPayment(payload);
        if (!result.ok || !result.receipt) {
          setError(result.error ?? "Unable to save payment.");
          return;
        }
        setSavedReceipt(result.receipt);
        setSuccess(`Payment saved. Supplier balance ${formatRupee(result.currentBalance ?? 0)}.`);
        setSupplierOptions((current) =>
          current.map((supplier) =>
            supplier.id === supplierId ? { ...supplier, balance: result.currentBalance ?? supplier.balance } : supplier
          )
        );
        setAmount("");
        setNotes("");
        router.refresh();
      })();
    });
  }

  return (
    <>
      <form onSubmit={submit} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Supplier Payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SearchableSelect
              label="Supplier"
              options={supplierOptions}
              value={supplierId}
              onChange={setSupplierId}
              placeholder="Search supplier"
              addLabel="Supplier"
              onAdd={() => setQuickSupplierOpen(true)}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="supplier-payment-date">Payment Date</Label>
                <Input id="supplier-payment-date" type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplier-payment-mode">Payment Mode</Label>
                <SelectNative
                  id="supplier-payment-mode"
                  value={paymentMode}
                  onChange={(event) => setPaymentMode(event.target.value as PaymentMode)}
                >
                  <option value={PaymentMode.CASH}>Cash</option>
                  <option value={PaymentMode.UPI}>UPI</option>
                  <option value={PaymentMode.BANK}>Bank</option>
                  <option value={PaymentMode.CHEQUE}>Cheque</option>
                </SelectNative>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="supplier-payment-amount">Amount</Label>
                <Input
                  id="supplier-payment-amount"
                  inputMode="decimal"
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Previous Balance</Label>
                <div className="flex h-12 items-center rounded-md border bg-muted px-3 font-semibold">{formatRupee(previousBalance)}</div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier-payment-notes">Notes</Label>
              <Textarea id="supplier-payment-notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
            </div>
            <div className="rounded-md border bg-muted/40 p-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Current Balance</span>
                <span className="text-lg font-semibold">{formatRupee(currentBalance)}</span>
              </div>
            </div>
            {error ? <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
            {success ? <p className="rounded-md bg-accent px-3 py-2 text-sm text-accent-foreground">{success}</p> : null}
            <Button className="w-full" size="lg" disabled={pending}>
              <Save className="h-5 w-5" />
              {pending ? "Saving..." : "Save Payment"}
            </Button>
          </CardContent>
        </Card>
      </form>

      {savedReceipt ? (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Payment Receipt</CardTitle>
          </CardHeader>
          <CardContent>
            <SupplierPaymentReceiptActions receipt={savedReceipt} profile={profile} />
          </CardContent>
        </Card>
      ) : null}

      <QuickAddSupplierDialog
        open={quickSupplierOpen}
        onOpenChange={setQuickSupplierOpen}
        onCreated={(option) => {
          setSupplierOptions((current) => [...current, option].sort((a, b) => a.label.localeCompare(b.label)));
          setSupplierId(option.id);
        }}
      />
    </>
  );
}