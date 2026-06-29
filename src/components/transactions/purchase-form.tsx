"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Save, Trash2 } from "lucide-react";
import { createPurchase, type PurchasePayload } from "@/app/(app)/purchase/actions";
import { QuickAddProductDialog, QuickAddSupplierDialog } from "@/components/forms/quick-add-dialogs";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SelectOption } from "@/lib/options";
import { formatRupee, toMoney, toQuantity } from "@/lib/utils";

type Line = {
  key: string;
  productId: string;
  kg: string;
  rate: string;
};

function newLine(): Line {
  return { key: crypto.randomUUID(), productId: "", kg: "", rate: "" };
}

export function PurchaseForm({
  suppliers,
  products,
  today
}: {
  suppliers: SelectOption[];
  products: SelectOption[];
  today: string;
}) {
  const router = useRouter();
  const [supplierOptions, setSupplierOptions] = useState(suppliers);
  const [productOptions, setProductOptions] = useState(products);
  const [supplierId, setSupplierId] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(today);
  const [paidAmount, setPaidAmount] = useState("");
  const [lines, setLines] = useState<Line[]>([newLine()]);
  const [quickSupplierOpen, setQuickSupplierOpen] = useState(false);
  const [quickProductOpen, setQuickProductOpen] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, startTransition] = useTransition();

  const selectedSupplier = supplierOptions.find((supplier) => supplier.id === supplierId);
  const previousBalance = selectedSupplier?.balance ?? 0;
  const total = useMemo(
    () => lines.reduce((sum, line) => sum + toMoney(toQuantity(line.kg) * toMoney(line.rate)), 0),
    [lines]
  );
  const currentBalance = previousBalance + total - toMoney(paidAmount);

  function updateLine(key: string, patch: Partial<Line>) {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  function removeLine(key: string) {
    setLines((current) => (current.length === 1 ? current : current.filter((line) => line.key !== key)));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    const payload: PurchasePayload = {
      purchaseDate,
      supplierId,
      paidAmount: Number(paidAmount || 0),
      items: lines.map((line) => ({
        productId: line.productId,
        kg: Number(line.kg || 0),
        rate: Number(line.rate || 0)
      }))
    };

    startTransition(() => {
      void (async () => {
        const result = await createPurchase(payload);
        if (!result.ok) {
          setError(result.error ?? "Unable to save purchase.");
          return;
        }
        setSuccess(`Purchase saved. Total ${formatRupee(result.totalAmount)}. Balance ${formatRupee(result.currentBalance ?? 0)}.`);
        setSupplierOptions((current) =>
          current.map((supplier) =>
            supplier.id === supplierId ? { ...supplier, balance: result.currentBalance ?? supplier.balance } : supplier
          )
        );
        setLines([newLine()]);
        setPaidAmount("");
        router.refresh();
      })();
    });
  }

  return (
    <>
      <form onSubmit={submit} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Purchase Entry</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
              <SearchableSelect
                label="Supplier"
                options={supplierOptions}
                value={supplierId}
                onChange={setSupplierId}
                placeholder="Search supplier"
                addLabel="Supplier"
                onAdd={() => setQuickSupplierOpen(true)}
              />
              <div className="space-y-2">
                <Label htmlFor="purchaseDate">Purchase Date</Label>
                <Input id="purchaseDate" type="date" value={purchaseDate} onChange={(event) => setPurchaseDate(event.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {lines.map((line, index) => {
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
                      <Label htmlFor={`kg-${line.key}`}>Kg</Label>
                      <Input
                        id={`kg-${line.key}`}
                        inputMode="decimal"
                        type="number"
                        min="0"
                        step="0.001"
                        value={line.kg}
                        onChange={(event) => updateLine(line.key, { kg: event.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`rate-${line.key}`}>Rate</Label>
                      <Input
                        id={`rate-${line.key}`}
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
              <div className="space-y-2">
                <Label htmlFor="paidAmount">Paid Amount</Label>
                <Input
                  id="paidAmount"
                  inputMode="decimal"
                  type="number"
                  min="0"
                  step="0.01"
                  value={paidAmount}
                  onChange={(event) => setPaidAmount(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Previous Balance</Label>
                <div className="flex h-12 items-center rounded-md border bg-muted px-3 font-semibold">{formatRupee(previousBalance)}</div>
              </div>
            </div>
            <div className="space-y-2 rounded-md border bg-muted/40 p-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Total Amount</span>
                <span className="font-semibold">{formatRupee(total)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Current Balance</span>
                <span className="text-lg font-semibold">{formatRupee(currentBalance)}</span>
              </div>
            </div>
            {error ? <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
            {success ? <p className="rounded-md bg-accent px-3 py-2 text-sm text-accent-foreground">{success}</p> : null}
            <Button className="w-full" size="lg" disabled={pending}>
              <Save className="h-5 w-5" />
              {pending ? "Saving..." : "Save Purchase"}
            </Button>
          </CardContent>
        </Card>
      </form>

      <QuickAddSupplierDialog
        open={quickSupplierOpen}
        onOpenChange={setQuickSupplierOpen}
        onCreated={(option) => {
          setSupplierOptions((current) => [...current, option].sort((a, b) => a.label.localeCompare(b.label)));
          setSupplierId(option.id);
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
