"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { REPORT_TABS, type ReportTab } from "@/lib/reports/tabs";
import { cn, DEFAULT_DATE_RANGE } from "@/lib/utils";

function appendDateParams(params: URLSearchParams, searchParams: URLSearchParams) {
  const range = searchParams.get("range") ?? DEFAULT_DATE_RANGE;
  params.set("range", range);
  if (range === "custom") {
    const from = searchParams.get("from") ?? searchParams.get("to");
    if (from) {
      params.set("from", from);
      params.set("to", from);
    }
  }
}

function hrefForTab(tab: ReportTab, searchParams: URLSearchParams) {
  const params = new URLSearchParams();
  params.set("tab", tab);

  if (tab === "purchase") {
    appendDateParams(params, searchParams);
    const supplier = searchParams.get("supplier");
    const product = searchParams.get("product");
    if (supplier) params.set("supplier", supplier);
    if (product) params.set("product", product);
  } else if (tab === "sales") {
    appendDateParams(params, searchParams);
    const customer = searchParams.get("customer");
    const product = searchParams.get("product");
    if (customer) params.set("customer", customer);
    if (product) params.set("product", product);
  } else if (tab === "outstanding") {
    const customer = searchParams.get("customer");
    if (customer) params.set("customer", customer);
  } else if (tab === "payment") {
    appendDateParams(params, searchParams);
    const customer = searchParams.get("customer");
    if (customer) params.set("customer", customer);
  }

  return `/reports?${params.toString()}`;
}

export function ReportTabs({ activeTab }: { activeTab: ReportTab }) {
  const searchParams = useSearchParams();

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {REPORT_TABS.map((tab) => (
        <Link
          key={tab.id}
          href={hrefForTab(tab.id, searchParams)}
          className={cn(
            "inline-flex h-10 shrink-0 items-center rounded-md border px-4 text-sm font-semibold transition-colors",
            activeTab === tab.id
              ? "border-primary bg-primary text-primary-foreground"
              : "border-input bg-background text-foreground hover:bg-muted"
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}