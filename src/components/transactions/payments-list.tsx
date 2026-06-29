"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Filter, Plus } from "lucide-react";
import { PaymentReceiptActions } from "@/components/transactions/payment-receipt-actions";
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
import type { BusinessProfile, PaymentReceiptDocument } from "@/lib/documents/types";
import type { SelectOption } from "@/lib/options";
import type { EditablePayment } from "@/lib/transactions/types";
import { PaginationControls } from "@/components/ui/pagination-controls";
import type { PageMeta } from "@/lib/pagination";
import { DEFAULT_LIST_DATE_RANGE, formatRupee } from "@/lib/utils";

export type PaymentListItem = {
  id: string;
  refNo: string;
  paymentDate: string;
  customerName: string;
  paymentMode: string;
  amount: number;
  notes: string;
  receipt: PaymentReceiptDocument;
  editable: EditablePayment;
};

type FilterState = {
  range: string;
  from: string;
  to: string;
  customer: string;
};

export function PaymentsList({
  payments,
  customers,
  profile,
  filter,
  filterLabel,
  pagination
}: {
  payments: PaymentListItem[];
  customers: SelectOption[];
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
  const [customer, setCustomer] = useState(filter.customer);

  function applyFilter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    params.set("tab", "customer");
    if (range !== DEFAULT_LIST_DATE_RANGE) {
      params.set("range", range);
    }
    if (range === "custom") {
      params.set("from", from);
      params.set("to", to);
    }
    if (customer) {
      params.set("customer", customer);
    }
    params.delete("page");
    router.push(`/payment?${params.toString()}`);
    setOpen(false);
  }

  function resetFilter() {
    router.push("/payment?tab=customer");
    setRange(DEFAULT_LIST_DATE_RANGE);
    setFrom(filter.from);
    setTo(filter.to);
    setCustomer("");
    setOpen(false);
  }

  const hasActiveFilter = filter.range !== DEFAULT_LIST_DATE_RANGE || filter.customer;

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
                <SheetTitle>Filter Payments</SheetTitle>
                <SheetDescription>Filter by date range and customer.</SheetDescription>
              </SheetHeader>
              <form className="mt-2 space-y-4" onSubmit={applyFilter}>
                <div className="space-y-2">
                  <Label htmlFor="payment-range">Date Range</Label>
                  <SelectNative id="payment-range" value={range} onChange={(event) => setRange(event.target.value)}>
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
                      <Label htmlFor="payment-from">From</Label>
                      <Input id="payment-from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="payment-to">To</Label>
                      <Input id="payment-to" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
                    </div>
                  </div>
                ) : null}
                <div className="space-y-2">
                  <Label htmlFor="payment-customer">Customer</Label>
                  <SelectNative id="payment-customer" value={customer} onChange={(event) => setCustomer(event.target.value)}>
                    <option value="">All Customers</option>
                    {customers.map((option) => (
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
              {filter.customer ? (
                <Badge variant="secondary">{customers.find((item) => item.id === filter.customer)?.label ?? "Customer"}</Badge>
              ) : null}
            </>
          ) : (
            <Badge variant="outline">{filterLabel}</Badge>
          )}
        </div>
        <Button asChild size="lg">
          <Link href="/payment/new?tab=customer">
            <Plus className="h-5 w-5" />
            Add Payment
          </Link>
        </Button>
      </div>

      {payments.length ? (
        <>
          <div className="hidden overflow-hidden rounded-md border md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/60 text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Reference</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Mode</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-b last:border-b-0">
                    <td className="px-4 py-3 font-medium">{payment.refNo}</td>
                    <td className="px-4 py-3">{payment.customerName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{payment.paymentDate}</td>
                    <td className="px-4 py-3 text-muted-foreground">{payment.paymentMode}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatRupee(payment.amount)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <PaymentReceiptActions
                          receipt={payment.receipt}
                          compact
                          profile={profile}
                          editable={payment.editable}
                          customers={customers}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {payments.map((payment) => (
              <Card key={payment.id}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{payment.customerName}</p>
                      <p className="text-sm text-muted-foreground">{payment.paymentMode}</p>
                      <p className="text-xs text-muted-foreground">{payment.paymentDate}</p>
                    </div>
                    <div className="flex items-start gap-1">
                      <p className="font-semibold">{formatRupee(payment.amount)}</p>
                      <PaymentReceiptActions
                        receipt={payment.receipt}
                        compact
                        profile={profile}
                        editable={payment.editable}
                        customers={customers}
                      />
                    </div>
                  </div>
                  {payment.notes ? <p className="text-sm text-muted-foreground">{payment.notes}</p> : null}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="space-y-4 p-6 text-center">
            <p className="text-sm text-muted-foreground">No payments found for the selected filter.</p>
            <Button asChild>
              <Link href="/payment/new?tab=customer">
                <Plus className="h-4 w-4" />
                Record First Payment
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <PaginationControls meta={pagination} />
    </div>
  );
}