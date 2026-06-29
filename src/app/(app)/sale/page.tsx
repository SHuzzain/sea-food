import { Suspense } from "react";
import { SalesList } from "@/components/transactions/sales-list";
import type { SavedSale } from "@/app/(app)/sale/actions";
import { getCachedSalesPage } from "@/lib/cache/queries";
import { getBusinessProfile } from "@/lib/business-profile";
import { getCustomerOptions, getProductOptions } from "@/lib/options";
import { parsePageParam } from "@/lib/pagination";
import {
  dateRangeFromFilter,
  decimalToNumber,
  DEFAULT_LIST_DATE_RANGE,
  formatDisplayDate,
  todayInputValue
} from "@/lib/utils";

type SalePageProps = {
  searchParams: Promise<{
    page?: string;
    range?: string;
    from?: string;
    to?: string;
    customer?: string;
  }>;
};

function toSavedSale(sale: {
  id: string;
  invoiceNo: string;
  invoiceDate: Date | string;
  previousBalance: { toString(): string };
  totalAmount: { toString(): string };
  receivedAmount: { toString(): string };
  currentBalance: { toString(): string };
  customer: { name: string; mobile: string | null };
  items: Array<{
    product: { name: string };
    kg: { toString(): string };
    rate: { toString(): string };
    amount: { toString(): string };
  }>;
}): SavedSale {
  return {
    id: sale.id,
    invoiceNo: sale.invoiceNo,
    invoiceDate: formatDisplayDate(sale.invoiceDate),
    customer: {
      name: sale.customer.name,
      mobile: sale.customer.mobile ?? ""
    },
    items: sale.items.map((item) => ({
      productName: item.product.name,
      kg: decimalToNumber(item.kg),
      rate: decimalToNumber(item.rate),
      amount: decimalToNumber(item.amount)
    })),
    previousBalance: decimalToNumber(sale.previousBalance),
    totalAmount: decimalToNumber(sale.totalAmount),
    receivedAmount: decimalToNumber(sale.receivedAmount),
    currentBalance: decimalToNumber(sale.currentBalance)
  };
}

export default async function SalePage({ searchParams }: SalePageProps) {
  const params = await searchParams;
  const page = parsePageParam(params.page);
  const range = dateRangeFromFilter(params, DEFAULT_LIST_DATE_RANGE);
  const customerId = params.customer?.trim() || undefined;
  const today = todayInputValue();

  const [customers, products, profile, salesResult] = await Promise.all([
    getCustomerOptions(),
    getProductOptions(),
    getBusinessProfile(),
    getCachedSalesPage(
      {
        page,
        rangeKey: params.range ?? DEFAULT_LIST_DATE_RANGE,
        from: params.from,
        to: params.to,
        customerId
      },
      range
    )
  ]);

  const saleItems = salesResult.items.map((sale) => {
    const savedSale = toSavedSale(sale);
    return {
      id: sale.id,
      invoiceNo: sale.invoiceNo,
      invoiceDate: savedSale.invoiceDate,
      customerName: sale.customer.name,
      productNames: savedSale.items.map((item) => item.productName).join(", "),
      totalAmount: savedSale.totalAmount,
      sale: savedSale,
      editable: {
        id: sale.id,
        invoiceNo: sale.invoiceNo,
        invoiceDate: todayInputValue(sale.invoiceDate),
        customerId: sale.customerId,
        receivedAmount: savedSale.receivedAmount,
        items: sale.items.map((item) => ({
          productId: item.productId,
          kg: decimalToNumber(item.kg),
          rate: decimalToNumber(item.rate)
        }))
      }
    };
  });

  return (
    <div className="app-container py-5 lg:py-8">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold tracking-normal">Sales</h1>
        <p className="text-sm text-muted-foreground">View sale bills, filter by date or customer, and share invoices.</p>
      </div>
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading sales...</div>}>
        <SalesList
          sales={saleItems}
          customers={customers}
          products={products}
          profile={profile}
          filter={{
            range: params.range ?? DEFAULT_LIST_DATE_RANGE,
            from: params.from ?? today,
            to: params.to ?? today,
            customer: params.customer ?? ""
          }}
          filterLabel={range.label}
          pagination={salesResult.pagination}
        />
      </Suspense>
    </div>
  );
}