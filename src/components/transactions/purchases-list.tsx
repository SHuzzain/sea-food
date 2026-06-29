"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Filter, Plus } from "lucide-react";
import { PurchaseActions } from "@/components/transactions/purchase-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@/components/ui/sheet";
import type { BusinessProfile } from "@/lib/documents/types";
import type { SelectOption } from "@/lib/options";
import type { EditablePurchase } from "@/lib/transactions/types";
import { PaginationControls } from "@/components/ui/pagination-controls";
import type { PageMeta } from "@/lib/pagination";
import { DEFAULT_LIST_DATE_RANGE, formatRupee } from "@/lib/utils";

export type PurchaseListItem = {
  id: string;
  refNo: string;
  purchaseDate: string;
  supplierName: string;
  productNames: string;
  totalAmount: number;
  document: {
    refNo: string;
    purchaseDate: string;
    supplier: { name: string; mobile: string };
    items: { productName: string; kg: number; rate: number; amount: number }[];
    totalAmount: number;
  };
  editable: EditablePurchase;
};

type FilterState = {
  range: string;
  from: string;
  to: string;
  supplier: string;
};

export function PurchasesList({
  purchases,
  suppliers,
  products,
  profile,
  filter,
  filterLabel,
  pagination
}: {
  purchases: PurchaseListItem[];
  suppliers: SelectOption[];
  products: SelectOption[];
  profile: BusinessProfile;
  filter: FilterState;
  filterLabel: string;
  pagination: PageMeta;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState(filter.range);
  const [from, setFrom] = useState(filter.from);
  const [to, setTo] = useState(filter.to);
  const [supplier, setSupplier] = useState(filter.supplier);

  function applyFilter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (range !== DEFAULT_LIST_DATE_RANGE) {
      params.set("range", range);
    }
    if (range === "custom") {
      params.set("from", from);
      params.set("to", to);
    }
    if (supplier) {
      params.set("supplier", supplier);
    }
    params.delete("page");
    router.push(`/purchase?${params.toString()}`);
    setOpen(false);
  }

  function resetFilter() {
    router.push("/purchase");
    setRange(DEFAULT_LIST_DATE_RANGE);
    setFrom(filter.from);
    setTo(filter.to);
    setSupplier("");
    setOpen(false);
  }

  const hasActiveFilter = filter.range !== DEFAULT_LIST_DATE_RANGE || filter.supplier;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button type="button" variant={hasActiveFilter ? "default" : "outline"} size="sm">
                <Filter className="h-4 w-4" />
                Filter
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Filter Purchases</SheetTitle>
                <SheetDescription>Filter by date range and supplier.</SheetDescription>
              </SheetHeader>
              <form className="mt-2 space-y-4" onSubmit={applyFilter}>
                <div className="space-y-2">
                  <Label htmlFor="purchase-range">Date Range</Label>
                  <SelectNative id="purchase-range" value={range} onChange={(event) => setRange(event.target.value)}>
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="custom">Custom Date</option>
                  </SelectNative>
                </div>
                {range === "custom" ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="purchase-from">From</Label>
                      <Input id="purchase-from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="purchase-to">To</Label>
                      <Input id="purchase-to" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
                    </div>
                  </div>
                ) : null}
                <div className="space-y-2">
                  <Label htmlFor="purchase-supplier">Supplier</Label>
                  <SelectNative id="purchase-supplier" value={supplier} onChange={(event) => setSupplier(event.target.value)}>
                    <option value="">All Suppliers</option>
                    {suppliers.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </SelectNative>
                </div>
                <div className="grid gap-2 pt-2">
                  <Button type="submit" size="lg" className="w-full">
                    <Filter className="h-4 w-4" />
                    Apply Filter
                  </Button>
                  <Button type="button" variant="outline" size="lg" className="w-full" onClick={resetFilter}>
                    Reset
                  </Button>
                </div>
              </form>
            </SheetContent>
          </Sheet>
          {hasActiveFilter ? (
            <>
              <Badge variant="secondary">{filterLabel}</Badge>
              {filter.supplier ? (
                <Badge variant="secondary">{suppliers.find((item) => item.id === filter.supplier)?.label ?? "Supplier"}</Badge>
              ) : null}
            </>
          ) : (
            <Badge variant="outline">{filterLabel}</Badge>
          )}
        </div>
        <Button asChild size="lg">
          <Link href="/purchase/new">
            <Plus className="h-5 w-5" />
            Add Purchase
          </Link>
        </Button>
      </div>

      {purchases.length ? (
        <>
          <div className="hidden overflow-hidden rounded-md border md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/60 text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Reference</th>
                  <th className="px-4 py-3 font-medium">Supplier</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Products</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((purchase) => (
                  <tr key={purchase.id} className="border-b last:border-b-0">
                    <td className="px-4 py-3 font-medium">{purchase.refNo}</td>
                    <td className="px-4 py-3">{purchase.supplierName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{purchase.purchaseDate}</td>
                    <td className="max-w-[240px] truncate px-4 py-3 text-muted-foreground" title={purchase.productNames}>
                      {purchase.productNames}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">{formatRupee(purchase.totalAmount)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <PurchaseActions
                          purchase={purchase.document}
                          profile={profile}
                          compact
                          editable={purchase.editable}
                          suppliers={suppliers}
                          products={products}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {purchases.map((purchase) => (
              <Card key={purchase.id}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{purchase.refNo}</p>
                      <p className="text-sm text-muted-foreground">{purchase.supplierName}</p>
                      <p className="text-xs text-muted-foreground">{purchase.purchaseDate}</p>
                    </div>
                    <div className="flex items-start gap-1">
                      <p className="font-semibold">{formatRupee(purchase.totalAmount)}</p>
                      <PurchaseActions
                        purchase={purchase.document}
                        profile={profile}
                        compact
                        editable={purchase.editable}
                        suppliers={suppliers}
                        products={products}
                      />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{purchase.productNames}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="space-y-4 p-6 text-center">
            <p className="text-sm text-muted-foreground">No purchases found for the selected filter.</p>
            <Button asChild>
              <Link href="/purchase/new">
                <Plus className="h-4 w-4" />
                Create First Purchase
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <PaginationControls meta={pagination} />
    </div>
  );
}