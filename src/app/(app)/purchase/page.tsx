import { Suspense } from "react";
import { PurchasesList } from "@/components/transactions/purchases-list";
import { getCachedPurchasesPage } from "@/lib/cache/queries";
import { getBusinessProfile } from "@/lib/business-profile";
import { getProductOptions, getSupplierOptions } from "@/lib/options";
import { parsePageParam } from "@/lib/pagination";
import {
  dateRangeFromFilter,
  decimalToNumber,
  DEFAULT_LIST_DATE_RANGE,
  formatDisplayDate,
  todayInputValue
} from "@/lib/utils";

type PurchasePageProps = {
  searchParams: Promise<{
    page?: string;
    range?: string;
    from?: string;
    to?: string;
    supplier?: string;
  }>;
};

function toPurchaseRef(purchaseDate: Date | string, id: string) {
  const datePart = todayInputValue(purchaseDate).replace(/-/g, "");
  return `PUR-${datePart}-${id.slice(-6).toUpperCase()}`;
}

export default async function PurchasePage({ searchParams }: PurchasePageProps) {
  const params = await searchParams;
  const page = parsePageParam(params.page);
  const range = dateRangeFromFilter(params, DEFAULT_LIST_DATE_RANGE);
  const supplierId = params.supplier?.trim() || undefined;
  const today = todayInputValue();

  const [suppliers, products, profile, purchasesResult] = await Promise.all([
    getSupplierOptions(),
    getProductOptions(),
    getBusinessProfile(),
    getCachedPurchasesPage(
      {
        page,
        rangeKey: params.range ?? DEFAULT_LIST_DATE_RANGE,
        from: params.from,
        to: params.to,
        supplierId
      },
      range
    )
  ]);

  const purchaseItems = purchasesResult.items.map((purchase) => {
    const refNo = toPurchaseRef(purchase.purchaseDate, purchase.id);
    const purchaseDate = formatDisplayDate(purchase.purchaseDate);
    const items = purchase.items.map((item) => ({
      productName: item.product.name,
      kg: decimalToNumber(item.kg),
      rate: decimalToNumber(item.rate),
      amount: decimalToNumber(item.amount)
    }));

    return {
      id: purchase.id,
      refNo,
      purchaseDate,
      supplierName: purchase.supplier.name,
      productNames: items.map((item) => item.productName).join(", "),
      totalAmount: decimalToNumber(purchase.totalAmount),
      document: {
        refNo,
        purchaseDate,
        supplier: {
          name: purchase.supplier.name,
          mobile: purchase.supplier.mobile ?? ""
        },
        items,
        totalAmount: decimalToNumber(purchase.totalAmount)
      },
      editable: {
        id: purchase.id,
        purchaseDate: todayInputValue(purchase.purchaseDate),
        supplierId: purchase.supplierId,
        items: purchase.items.map((item) => ({
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
        <h1 className="text-2xl font-semibold tracking-normal">Purchases</h1>
        <p className="text-sm text-muted-foreground">View supplier purchases, filter by date, and share receipts.</p>
      </div>
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading purchases...</div>}>
        <PurchasesList
          purchases={purchaseItems}
          suppliers={suppliers}
          products={products}
          profile={profile}
          filter={{
            range: params.range ?? DEFAULT_LIST_DATE_RANGE,
            from: params.from ?? today,
            to: params.to ?? today,
            supplier: params.supplier ?? ""
          }}
          filterLabel={range.label}
          pagination={purchasesResult.pagination}
        />
      </Suspense>
    </div>
  );
}