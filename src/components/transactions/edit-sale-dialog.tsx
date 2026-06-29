"use client";

import { FormEvent, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Save, Trash2 } from "lucide-react";
import { updateSale } from "@/app/(app)/sale/actions";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SelectOption } from "@/lib/options";
import type { EditableSale } from "@/lib/transactions/types";
import { formatRupee, toMoney, toQuantity } from "@/lib/utils";

type Line = { key: string; productId: string; kg: string; rate: string };

function newLine(): Line {
  return { key: crypto.randomUUID(), productId: "", kg: "", rate: "" };
}

function toLines(items: EditableSale["items"]): Line[] {
  return items.length
    ? items.map((item) => ({
        key: crypto.randomUUID(),
        productId: item.productId,
        kg: String(item.kg),
        rate: String(item.rate)
      }))
    : [newLine()];
}

export function EditSaleDialog({
  open,
  onOpenChange,
  sale,
  customers,
  products
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: EditableSale | null;
  customers: SelectOption[];
  products: SelectOption[];
}) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [receivedAmount, setReceivedAmount] = useState("");
  const [lines, setLines] = useState<Line[]>([newLine()]);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!sale || !open) {
      return;
    }
    setCustomerId(sale.customerId);
    setInvoiceDate(sale.invoiceDate);
    setReceivedAmount(String(sale.receivedAmount));
    setLines(toLines(sale.items));
    setError("");
  }, [sale, open]);

  const totalAmount = useMemo(
    () => lines.reduce((sum, line) => sum + toMoney(toQuantity(line.kg) * toMoney(line.rate)), 0),
    [lines]
  );

  function updateLine(key: string, patch: Partial<Line>) {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  function removeLine(key: string) {
    setLines((current) => (current.length === 1 ? current : current.filter((line) => line.key !== key)));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sale) {
      return;
    }
    setError("");
    startTransition(() => {
      void (async () => {
        const result = await updateSale(sale.id, {
          customerId,
          invoiceDate,
          receivedAmount: Number(receivedAmount || 0),
          items: lines.map((line) => ({
            productId: line.productId,
            kg: Number(line.kg || 0),
            rate: Number(line.rate || 0)
          }))
        });
        if (!result.ok) {
          setError(result.error ?? "Unable to update sale.");
          return;
        }
        onOpenChange(false);
        router.refresh();
      })();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Edit Sale {sale?.invoiceNo ? `· ${sale.invoiceNo}` : ""}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <SearchableSelect label="Customer" options={customers} value={customerId} onChange={setCustomerId} placeholder="Search customer" />
            <div className="space-y-2">
              <Label htmlFor="edit-sale-date">Invoice Date</Label>
              <Input id="edit-sale-date" type="date" value={invoiceDate} onChange={(event) => setInvoiceDate(event.target.value)} />
            </div>
          </div>
          <div className="space-y-3">
            {lines.map((line, index) => {
              const amount = toMoney(toQuantity(line.kg) * toMoney(line.rate));
              return (
                <div key={line.key} className="space-y-3 rounded-md border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold">Item {index + 1}</p>
                    <Button type="button" variant="ghost" size="icon" aria-label="Remove item" onClick={() => removeLine(line.key)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <SearchableSelect
                    label="Product"
                    options={products}
                    value={line.productId}
                    onChange={(value) => updateLine(line.key, { productId: value })}
                    placeholder="Search fish"
                  />
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor={`edit-sale-kg-${line.key}`}>Kg</Label>
                      <Input
                        id={`edit-sale-kg-${line.key}`}
                        inputMode="decimal"
                        type="number"
                        min="0"
                        step="0.001"
                        value={line.kg}
                        onChange={(event) => updateLine(line.key, { kg: event.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`edit-sale-rate-${line.key}`}>Rate</Label>
                      <Input
                        id={`edit-sale-rate-${line.key}`}
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
                      <div className="flex h-10 items-center rounded-md border bg-muted px-3 font-semibold">{formatRupee(amount)}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <Button type="button" variant="outline" className="w-full" onClick={() => setLines((current) => [...current, newLine()])}>
            <Plus className="h-4 w-4" />
            Add Item
          </Button>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-sale-received">Received Amount</Label>
              <Input id="edit-sale-received" inputMode="decimal" type="number" min="0" step="0.01" value={receivedAmount} onChange={(event) => setReceivedAmount(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Total Amount</Label>
              <div className="flex h-10 items-center justify-between rounded-md border bg-muted px-3 font-semibold">
                <span>{formatRupee(totalAmount)}</span>
              </div>
            </div>
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