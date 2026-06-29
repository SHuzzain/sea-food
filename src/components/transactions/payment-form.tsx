"use client";

import { PaymentMode } from "@prisma/client";
import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { createPayment, type PaymentPayload } from "@/app/(app)/payment/actions";
import { QuickAddCustomerDialog } from "@/components/forms/quick-add-dialogs";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { PaymentReceiptActions } from "@/components/transactions/payment-receipt-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import { Textarea } from "@/components/ui/textarea";
import type { SelectOption } from "@/lib/options";
import type { BusinessProfile, PaymentReceiptDocument } from "@/lib/documents/types";
import { DEFAULT_BUSINESS_PROFILE } from "@/lib/documents/types";
import { formatRupee, toMoney } from "@/lib/utils";

export function PaymentForm({
  customers,
  today,
  profile = DEFAULT_BUSINESS_PROFILE
}: {
  customers: SelectOption[];
  today: string;
  profile?: BusinessProfile;
}) {
  const router = useRouter();
  const [customerOptions, setCustomerOptions] = useState(customers);
  const [customerId, setCustomerId] = useState("");
  const [paymentDate, setPaymentDate] = useState(today);
  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(PaymentMode.CASH);
  const [notes, setNotes] = useState("");
  const [quickCustomerOpen, setQuickCustomerOpen] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [savedReceipt, setSavedReceipt] = useState<PaymentReceiptDocument | null>(null);
  const [pending, startTransition] = useTransition();

  const selectedCustomer = customerOptions.find((customer) => customer.id === customerId);
  const previousBalance = selectedCustomer?.balance ?? 0;
  const currentBalance = previousBalance - toMoney(amount);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSavedReceipt(null);

    if (!customerId) {
      setError("Select a customer.");
      return;
    }

    const payload: PaymentPayload = {
      customerId,
      paymentDate,
      amount: Number(amount || 0),
      paymentMode,
      notes
    };

    startTransition(() => {
      void (async () => {
        const result = await createPayment(payload);
        if (!result.ok) {
          setError(result.error ?? "Unable to save payment.");
          return;
        }
        setCustomerOptions((current) =>
          current.map((customer) => (customer.id === customerId ? { ...customer, balance: result.currentBalance } : customer))
        );
        setSuccess(`Payment saved. Current balance ${formatRupee(result.currentBalance)}.`);
        setSavedReceipt(result.receipt ?? null);
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
            <CardTitle>Customer Payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <SearchableSelect
                label="Customer"
                options={customerOptions}
                value={customerId}
                onChange={setCustomerId}
                placeholder="Search customer name"
                onAdd={() => setQuickCustomerOpen(true)}
                addLabel="Customer"
                showBalance
              />
              <SearchableSelect
                label="Mobile"
                options={customerOptions}
                value={customerId}
                onChange={setCustomerId}
                placeholder="Search mobile number"
                displayKey="meta"
                showBalance
              />
            </div>

            {selectedCustomer ? (
              <>
                <div className="rounded-md border bg-muted/50 p-3">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Selected customer</p>
                      <p className="font-semibold">{selectedCustomer.label}</p>
                      <p className="text-sm text-muted-foreground">{selectedCustomer.meta || "No mobile"}</p>
                    </div>
                    <div className="sm:text-right">
                      <p className="text-sm text-muted-foreground">Outstanding</p>
                      <p className="text-xl font-semibold">{formatRupee(previousBalance)}</p>
                    </div>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="paymentDate">Payment Date</Label>
                    <Input id="paymentDate" type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paymentMode">Payment Mode</Label>
                    <SelectNative
                      id="paymentMode"
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
                  <div className="rounded-md bg-muted p-3">
                    <p className="text-sm text-muted-foreground">Outstanding</p>
                    <p className="text-xl font-semibold">{formatRupee(previousBalance)}</p>
                  </div>
                  <div className="rounded-md bg-accent p-3 text-accent-foreground">
                    <p className="text-sm text-accent-foreground/80">After Payment</p>
                    <p className="text-xl font-semibold">{formatRupee(currentBalance)}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
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
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
                </div>
                {error ? <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
                {success ? <p className="rounded-md bg-accent px-3 py-2 text-sm text-accent-foreground">{success}</p> : null}
                <Button className="w-full" size="lg" disabled={pending}>
                  <Save className="h-5 w-5" />
                  {pending ? "Saving..." : "Save Payment"}
                </Button>
              </>
            ) : (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                Search and select a customer by name or mobile to enter payment details.
              </div>
            )}
          </CardContent>
        </Card>
      </form>

      {savedReceipt ? (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Payment Receipt</CardTitle>
          </CardHeader>
          <CardContent>
            <PaymentReceiptActions receipt={savedReceipt} profile={profile} />
          </CardContent>
        </Card>
      ) : null}

      <QuickAddCustomerDialog
        open={quickCustomerOpen}
        onOpenChange={setQuickCustomerOpen}
        onCreated={(option) => {
          setCustomerOptions((current) => [...current, option].sort((a, b) => a.label.localeCompare(b.label)));
          setCustomerId(option.id);
        }}
      />
    </>
  );
}