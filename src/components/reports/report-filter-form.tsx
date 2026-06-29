"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Filter } from "lucide-react";
import type { ReportTab } from "@/lib/reports/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import type { SelectOption } from "@/lib/options";
import { DEFAULT_DATE_RANGE } from "@/lib/utils";

export function ReportFilterForm({
  tab,
  range,
  customer,
  supplier,
  product,
  date,
  customers,
  suppliers,
  products
}: {
  tab: ReportTab;
  range: string;
  customer: string;
  supplier: string;
  product: string;
  date: string;
  customers: SelectOption[];
  suppliers: SelectOption[];
  products: SelectOption[];
}) {
  const router = useRouter();
  const [selectedRange, setSelectedRange] = useState(range);
  const showDateRange = tab === "purchase" || tab === "sales" || tab === "payment";
  const showCustomer = tab === "sales" || tab === "outstanding" || tab === "payment";
  const showSupplier = tab === "purchase";
  const showProduct = tab === "purchase" || tab === "sales";

  function applyFilter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    params.set("tab", tab);

    if (showDateRange) {
      const nextRange = String(formData.get("range") ?? DEFAULT_DATE_RANGE);
      params.set("range", nextRange);
      if (nextRange === "custom") {
        const customDate = String(formData.get("date") ?? date);
        params.set("from", customDate);
        params.set("to", customDate);
      }
    }

    if (showCustomer) {
      const nextCustomer = String(formData.get("customer") ?? "").trim();
      if (nextCustomer) {
        params.set("customer", nextCustomer);
      }
    }

    if (showSupplier) {
      const nextSupplier = String(formData.get("supplier") ?? "").trim();
      if (nextSupplier) {
        params.set("supplier", nextSupplier);
      }
    }

    if (showProduct) {
      const nextProduct = String(formData.get("product") ?? "").trim();
      if (nextProduct) {
        params.set("product", nextProduct);
      }
    }

    router.push(`/reports?${params.toString()}`);
  }

  const fieldCount =
    (showDateRange ? 1 : 0) +
    (showCustomer ? 1 : 0) +
    (showSupplier ? 1 : 0) +
    (showProduct ? 1 : 0) +
    (showDateRange && selectedRange === "custom" ? 1 : 0);

  return (
    <form
      className={`grid gap-3 sm:grid-cols-2 ${
        fieldCount >= 4 ? "lg:grid-cols-3 xl:grid-cols-[160px_1fr_1fr_1fr_auto]" : "lg:grid-cols-3 xl:grid-cols-[160px_1fr_1fr_auto]"
      }`}
      onSubmit={applyFilter}
    >
      {showDateRange ? (
        <SelectNative name="range" value={selectedRange} onChange={(event) => setSelectedRange(event.target.value)}>
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="custom">Custom Date</option>
        </SelectNative>
      ) : null}
      {showCustomer ? (
        <SelectNative name="customer" defaultValue={customer}>
          <option value="">All Customers</option>
          {customers.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </SelectNative>
      ) : null}
      {showSupplier ? (
        <SelectNative name="supplier" defaultValue={supplier}>
          <option value="">All Suppliers</option>
          {suppliers.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </SelectNative>
      ) : null}
      {showProduct ? (
        <SelectNative name="product" defaultValue={product}>
          <option value="">All Products</option>
          {products.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </SelectNative>
      ) : null}
      {showDateRange && selectedRange === "custom" ? (
        <div className="space-y-2">
          <Label htmlFor="report-date" className="sr-only">
            Date
          </Label>
          <Input id="report-date" name="date" type="date" defaultValue={date} required />
        </div>
      ) : null}
      <Button type="submit" size="lg" className="sm:col-span-2 lg:col-span-1">
        <Filter className="h-4 w-4" />
        Apply
      </Button>
    </form>
  );
}