"use client";

import { FormEvent, SubmitEvent, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Filter } from "lucide-react";
import type { ReportTab } from "@/lib/reports/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import type { SelectOption } from "@/lib/options";
import { DEFAULT_DATE_RANGE } from "@/lib/utils";

function FilterField({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div className="min-w-0 space-y-2 lg:min-w-[11rem] lg:flex-1">
      <Label htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

export function ReportFilterForm({
  tab,
  range,
  customer,
  supplier,
  product,
  from,
  to,
  customers,
  suppliers,
  products
}: {
  tab: ReportTab;
  range: string;
  customer: string;
  supplier: string;
  product: string;
  from: string;
  to: string;
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
  const showCustomDates = showDateRange && selectedRange === "custom";

  function applyFilter(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    params.set("tab", tab);

    if (showDateRange) {
      const nextRange = String(formData.get("range") ?? DEFAULT_DATE_RANGE);
      params.set("range", nextRange);
      if (nextRange === "custom") {
        const customFrom = String(formData.get("from") ?? from);
        const customTo = String(formData.get("to") ?? to);
        params.set("from", customFrom);
        params.set("to", customTo);
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

  return (
    <form onSubmit={applyFilter}>
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
        {showDateRange ? (
          <FilterField label="Date Range" htmlFor="report-range">
            <SelectNative id="report-range" name="range" value={selectedRange} onChange={(event) => setSelectedRange(event.target.value)}>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="custom">Custom Date</option>
            </SelectNative>
          </FilterField>
        ) : null}

        {showCustomer ? (
          <FilterField label="Customer" htmlFor="report-customer">
            <SelectNative id="report-customer" name="customer" defaultValue={customer}>
              <option value="">All Customers</option>
              {customers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </SelectNative>
          </FilterField>
        ) : null}

        {showSupplier ? (
          <FilterField label="Supplier" htmlFor="report-supplier">
            <SelectNative id="report-supplier" name="supplier" defaultValue={supplier}>
              <option value="">All Suppliers</option>
              {suppliers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </SelectNative>
          </FilterField>
        ) : null}

        {showProduct ? (
          <FilterField label="Product" htmlFor="report-product">
            <SelectNative id="report-product" name="product" defaultValue={product}>
              <option value="">All Products</option>
              {products.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </SelectNative>
          </FilterField>
        ) : null}

        {showCustomDates ? (
          <>
            <FilterField label="From" htmlFor="report-from">
              <Input id="report-from" name="from" type="date" defaultValue={from} required />
            </FilterField>
            <FilterField label="To" htmlFor="report-to">
              <Input id="report-to" name="to" type="date" defaultValue={to} required />
            </FilterField>
          </>
        ) : null}

        <Button type="submit" size="lg" className="w-full shrink-0 lg:w-auto lg:min-w-[7.5rem]">
          <Filter className="h-4 w-4" />
          Apply
        </Button>
      </div>
    </form>
  );
}