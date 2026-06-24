import { todayInputValue } from "@/lib/utils";

export type WeeklySellBuyRow = {
  key: string;
  date: string;
  purchase: number;
  sales: number;
  profit: number;
};

type PurchaseLike = {
  purchaseDate: Date;
  totalAmount: { toString(): string } | number | string | null;
};

type SaleLike = {
  invoiceDate: Date;
  totalAmount: { toString(): string } | number | string | null;
};

function numberValue(value: { toString(): string } | number | string | null) {
  return Number(value?.toString() ?? 0);
}

export function buildWeeklySellBuyRows(from: Date, to: Date, purchases: PurchaseLike[], sales: SaleLike[]) {
  const purchaseByDate = new Map<string, number>();
  const salesByDate = new Map<string, number>();

  purchases.forEach((purchase) => {
    const key = todayInputValue(purchase.purchaseDate);
    purchaseByDate.set(key, (purchaseByDate.get(key) ?? 0) + numberValue(purchase.totalAmount));
  });

  sales.forEach((sale) => {
    const key = todayInputValue(sale.invoiceDate);
    salesByDate.set(key, (salesByDate.get(key) ?? 0) + numberValue(sale.totalAmount));
  });

  const rows: WeeklySellBuyRow[] = [];
  const day = new Date(from);
  day.setHours(0, 0, 0, 0);
  const last = new Date(to);
  last.setHours(0, 0, 0, 0);

  while (day <= last) {
    const key = todayInputValue(day);
    const purchase = purchaseByDate.get(key) ?? 0;
    const saleTotal = salesByDate.get(key) ?? 0;
    rows.push({
      key,
      date: day.toLocaleDateString("en-IN"),
      purchase,
      sales: saleTotal,
      profit: saleTotal - purchase
    });
    day.setDate(day.getDate() + 1);
  }

  return rows;
}
