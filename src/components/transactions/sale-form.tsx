"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, Plus, Save, Trash2 } from "lucide-react";
import { createSale, type SalePayload, type SavedSale } from "@/app/(app)/sale/actions";
import { QuickAddCustomerDialog, QuickAddProductDialog } from "@/components/forms/quick-add-dialogs";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { InvoiceActions } from "@/components/transactions/invoice-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SelectOption } from "@/lib/options";
import { formatKg, formatRupee, toMoney, toQuantity } from "@/lib/utils";

type Line = {
  key: string;
  productId: string;
  kg: string;
  rate: string;
};

function newLine(): Line {
  return { key: crypto.randomUUID(), productId: "", kg: "", rate: "" };
}

export function SaleForm({
  customers,
  products,
  today
}: {
  customers: SelectOption[];
  products: SelectOption[];
  today: string;
}) {
  const router = useRouter();
  const [customerOptions, setCustomerOptions] = useState(customers);
  const [productOptions, setProductOptions] = useState(products);
  const [customerId, setCustomerId] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(today);
  const [receivedAmount, setReceivedAmount] = useState("");
  const [lines, setLines] = useState<Line[]>([newLine()]);
  const [quickCustomerOpen, setQuickCustomerOpen] = useState(false);
  const [quickProductOpen, setQuickProductOpen] = useState(false);
  const [savedSale, setSavedSale] = useState<SavedSale | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const selectedCustomer = customerOptions.find((customer) => customer.id === customerId);
  const previousBalance = selectedCustomer?.balance ?? 0;
  const totalAmount = useMemo(
    () => lines.reduce((sum, line) => sum + toMoney(toQuantity(line.kg) * toMoney(line.rate)), 0),
    [lines]
  );
  const currentBalance = previousBalance + totalAmount - toMoney(receivedAmount);

  function updateLine(key: string, patch: Partial<Line>) {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  function removeLine(key: string) {
    setLines((current) => (current.length === 1 ? current : current.filter((line) => line.key !== key)));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSavedSale(null);
    const payload: SalePayload = {
      customerId,
      invoiceDate,
      receivedAmount: Number(receivedAmount || 0),
      items: lines.map((line) => ({
        productId: line.productId,
        kg: Number(line.kg || 0),
        rate: Number(line.rate || 0)
      }))
    };

    startTransition(() => {
      void (async () => {
        const result = await createSale(payload);
        if (!result.ok || !result.sale) {
          setError(result.error ?? "Unable to save sale.");
          return;
        }
        setSavedSale(result.sale);
        setCustomerOptions((current) =>
          current.map((customer) => (customer.id === customerId ? { ...customer, balance: result.sale.currentBalance } : customer))
        );
        setLines([newLine()]);
        setReceivedAmount("");
        router.refresh();
      })();
    });
  }

  return (
    <>
      <form onSubmit={submit} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Sale Bill Entry</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
              <SearchableSelect
                label="Customer"
                options={customerOptions}
                value={customerId}
                onChange={setCustomerId}
                placeholder="Search customer"
                addLabel="Customer"
                onAdd={() => setQuickCustomerOpen(true)}
              />
              <div className="space-y-2">
                <Label htmlFor="invoiceDate">Invoice Date</Label>
                <Input id="invoiceDate" type="date" value={invoiceDate} onChange={(event) => setInvoiceDate(event.target.value)} />
              </div>
            </div>
            <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
              Invoice number is generated automatically when the bill is saved.
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {lines.map((line, index) => {
            const product = productOptions.find((option) => option.id === line.productId);
            const amount = toMoney(toQuantity(line.kg) * toMoney(line.rate));
            return (
              <Card key={line.key}>
                <CardContent className="space-y-4 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold">Item {index + 1}</p>
                    <Button type="button" variant="ghost" size="icon" aria-label="Remove item" onClick={() => removeLine(line.key)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <SearchableSelect
                    label="Product"
                    options={productOptions}
                    value={line.productId}
                    onChange={(value) => updateLine(line.key, { productId: value })}
                    placeholder="Search fish"
                    addLabel="Product"
                    onAdd={() => setQuickProductOpen(true)}
                  />
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor={`sale-kg-${line.key}`}>Kg</Label>
                      <Input
                        id={`sale-kg-${line.key}`}
                        inputMode="decimal"
                        type="number"
                        min="0"
                        step="0.001"
                        value={line.kg}
                        onChange={(event) => updateLine(line.key, { kg: event.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`sale-rate-${line.key}`}>Rate</Label>
                      <Input
                        id={`sale-rate-${line.key}`}
                        inputMode="decimal"
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.rate}
                        onChange={(event) => updateLine(line.key, { rate: event.target.value })}
                      />
                    </div>
                    <div className="col-span-2 space-y-2 sm:col-span-1">
                      <Label>Amount</Label>
                      <div className="flex h-12 items-center rounded-md border bg-muted px-3 font-semibold">{formatRupee(amount)}</div>
                    </div>
                  </div>
                  {product ? <p className="text-xs text-muted-foreground">Unit: {product.unit ?? product.meta ?? "kg"}</p> : null}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Button type="button" variant="outline" size="lg" className="w-full" onClick={() => setLines((current) => [...current, newLine()])}>
          <Plus className="h-5 w-5" />
          Add Item
        </Button>

        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md bg-muted p-3">
                <p className="text-sm text-muted-foreground">Previous Balance</p>
                <p className="text-xl font-semibold">{formatRupee(previousBalance)}</p>
              </div>
              <div className="rounded-md bg-muted p-3">
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-xl font-semibold">{formatRupee(totalAmount)}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="receivedAmount">Received Amount</Label>
                <Input
                  id="receivedAmount"
                  inputMode="decimal"
                  type="number"
                  min="0"
                  step="0.01"
                  value={receivedAmount}
                  onChange={(event) => setReceivedAmount(event.target.value)}
                />
              </div>
              <div className="rounded-md bg-accent p-3">
                <p className="text-sm text-accent-foreground/80">Current Balance</p>
                <p className="text-xl font-semibold text-accent-foreground">{formatRupee(currentBalance)}</p>
              </div>
            </div>
            {error ? <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
            <Button className="w-full" size="lg" disabled={pending}>
              <Save className="h-5 w-5" />
              {pending ? "Saving..." : "Save Sale Bill"}
            </Button>
          </CardContent>
        </Card>
      </form>

      {savedSale ? (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Invoice {savedSale.invoiceNo}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border">
              <div className="grid grid-cols-4 border-b bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground">
                <span className="col-span-2">Product</span>
                <span className="text-right">Kg</span>
                <span className="text-right">Amount</span>
              </div>
              {savedSale.items.map((item) => (
                <div key={`${item.productName}-${item.kg}-${item.rate}`} className="grid grid-cols-4 px-3 py-2 text-sm">
                  <span className="col-span-2">{item.productName}</span>
                  <span className="text-right">{formatKg(item.kg)}</span>
                  <span className="text-right">{formatRupee(item.amount)}</span>
                </div>
              ))}
            </div>
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <p className="flex justify-between gap-3 rounded-md bg-muted p-3">
                <span>Previous</span>
                <strong>{formatRupee(savedSale.previousBalance)}</strong>
              </p>
              <p className="flex justify-between gap-3 rounded-md bg-muted p-3">
                <span>Total</span>
                <strong>{formatRupee(savedSale.totalAmount)}</strong>
              </p>
              <p className="flex justify-between gap-3 rounded-md bg-muted p-3">
                <span>Received</span>
                <strong>{formatRupee(savedSale.receivedAmount)}</strong>
              </p>
              <p className="flex justify-between gap-3 rounded-md bg-accent p-3 text-accent-foreground">
                <span>Current</span>
                <strong>{formatRupee(savedSale.currentBalance)}</strong>
              </p>
            </div>
            <InvoiceActions sale={savedSale} />
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
      <QuickAddProductDialog
        open={quickProductOpen}
        onOpenChange={setQuickProductOpen}
        onCreated={(option) => {
          setProductOptions((current) => [...current, option].sort((a, b) => a.label.localeCompare(b.label)));
        }}
      />
    </>
  );
}
