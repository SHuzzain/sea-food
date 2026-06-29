"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { DEFAULT_PAYMENT_TAB, PAYMENT_TABS, type PaymentTab } from "@/lib/payments/tabs";
import { cn, DEFAULT_LIST_DATE_RANGE } from "@/lib/utils";

function appendListParams(params: URLSearchParams, searchParams: URLSearchParams) {
  const range = searchParams.get("range") ?? DEFAULT_LIST_DATE_RANGE;
  if (range !== DEFAULT_LIST_DATE_RANGE) {
    params.set("range", range);
  }
  if (range === "custom") {
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    if (from) {
      params.set("from", from);
    }
    if (to) {
      params.set("to", to);
    }
  }
}

function hrefForTab(tab: PaymentTab, searchParams: URLSearchParams, basePath: "/payment" | "/payment/new") {
  const params = new URLSearchParams();
  const currentTab = searchParams.get("tab") ?? DEFAULT_PAYMENT_TAB;
  if (tab !== DEFAULT_PAYMENT_TAB) {
    params.set("tab", tab);
  }
  if (basePath === "/payment" && tab !== currentTab) {
    params.delete("page");
  }

  if (basePath === "/payment") {
    appendListParams(params, searchParams);
    if (tab === "customer") {
      const customer = searchParams.get("customer");
      if (customer) {
        params.set("customer", customer);
      }
    } else {
      const supplier = searchParams.get("supplier");
      if (supplier) {
        params.set("supplier", supplier);
      }
    }
  }

  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function PaymentTabs({ activeTab, basePath = "/payment" }: { activeTab: PaymentTab; basePath?: "/payment" | "/payment/new" }) {
  const searchParams = useSearchParams();

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {PAYMENT_TABS.map((tab) => (
        <Link
          key={tab.id}
          href={hrefForTab(tab.id, searchParams, basePath)}
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