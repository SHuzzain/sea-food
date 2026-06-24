import { Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { ReportDownloadActions, type ReportDownloadData } from "@/components/reports/report-download-actions";
import { prisma } from "@/lib/prisma";
import { dateRangeFromFilter, decimalToNumber, formatRupee, todayInputValue } from "@/lib/utils";
import { buildWeeklySellBuyRows } from "@/lib/weekly-sell-buy";

type ReportsPageProps = {
  searchParams: Promise<{
    range?: string;
    from?: string;
    to?: string;
  }>;
};

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const params = await searchParams;
  const range = dateRangeFromFilter(params);
  const dateWhere = { gte: range.from, lte: range.to };

  const [purchases, sales, outstandingCustomers, payments, purchaseTotal, salesTotal, paymentTotal, expenseTotal] =
    await Promise.all([
      prisma.purchase.findMany({
        where: { purchaseDate: dateWhere },
        orderBy: { purchaseDate: "desc" },
        include: { supplier: true, items: { include: { product: true } } }
      }),
      prisma.sale.findMany({
        where: { invoiceDate: dateWhere },
        orderBy: { invoiceDate: "desc" },
        include: { customer: true, items: { include: { product: true } } }
      }),
      prisma.customer.findMany({
        where: { status: "ACTIVE", outstandingBalance: { gt: 0 } },
        orderBy: { name: "asc" }
      }),
      prisma.payment.findMany({
        where: { paymentDate: dateWhere },
        orderBy: { paymentDate: "desc" },
        include: { customer: true }
      }),
      prisma.purchase.aggregate({ where: { purchaseDate: dateWhere }, _sum: { totalAmount: true } }),
      prisma.sale.aggregate({ where: { invoiceDate: dateWhere }, _sum: { totalAmount: true, receivedAmount: true } }),
      prisma.payment.aggregate({ where: { paymentDate: dateWhere }, _sum: { amount: true } }),
      prisma.expense.aggregate({ where: { expenseDate: dateWhere }, _sum: { amount: true } })
    ]);

  const purchaseAmount = decimalToNumber(purchaseTotal._sum.totalAmount);
  const saleAmount = decimalToNumber(salesTotal._sum.totalAmount);
  const saleReceived = decimalToNumber(salesTotal._sum.receivedAmount);
  const paymentAmount = decimalToNumber(paymentTotal._sum.amount);
  const expenseAmount = decimalToNumber(expenseTotal._sum.amount);
  const profit = saleAmount - purchaseAmount - expenseAmount;
  const isWeeklyReport = (params.range ?? "today") === "week";
  const weeklySellBuyRows = isWeeklyReport ? buildWeeklySellBuyRows(range.from, range.to, purchases, sales) : [];
  const weeklyPurchaseTotal = weeklySellBuyRows.reduce((sum, row) => sum + row.purchase, 0);
  const weeklySalesTotal = weeklySellBuyRows.reduce((sum, row) => sum + row.sales, 0);
  const reportDownloadData: ReportDownloadData = {
    label: range.label,
    from: range.from.toLocaleDateString("en-IN"),
    to: range.to.toLocaleDateString("en-IN"),
    summary: {
      purchase: purchaseAmount,
      sales: saleAmount,
      collection: saleReceived + paymentAmount,
      profit
    },
    weeklySellBuy: weeklySellBuyRows,
    purchases: purchases.map((purchase) => ({
      date: purchase.purchaseDate.toLocaleDateString("en-IN"),
      supplier: purchase.supplier.name,
      products: purchase.items.map((item) => item.product.name).join(", "),
      amount: decimalToNumber(purchase.totalAmount)
    })),
    sales: sales.map((sale) => ({
      date: sale.invoiceDate.toLocaleDateString("en-IN"),
      invoiceNo: sale.invoiceNo,
      customer: sale.customer.name,
      products: sale.items.map((item) => item.product.name).join(", "),
      amount: decimalToNumber(sale.totalAmount)
    })),
    outstandingCustomers: outstandingCustomers.map((customer) => ({
      customer: customer.name,
      mobile: customer.mobile ?? "",
      balance: decimalToNumber(customer.outstandingBalance)
    })),
    payments: payments.map((payment) => ({
      date: payment.paymentDate.toLocaleDateString("en-IN"),
      customer: payment.customer.name,
      mode: payment.paymentMode,
      amount: decimalToNumber(payment.amount)
    })),
    profit: {
      sales: saleAmount,
      purchase: purchaseAmount,
      expense: expenseAmount,
      profit
    }
  };

  return (
    <div className="app-container py-5 lg:py-8">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold tracking-normal">Reports</h1>
        <p className="text-sm text-muted-foreground">Purchase, sales, outstanding, collection and profit reports.</p>
      </div>

      <Card className="mb-5">
        <CardContent className="p-4">
          <form className="grid gap-3 md:grid-cols-[180px_1fr_1fr_auto]" action="/reports">
            <SelectNative name="range" defaultValue={params.range ?? "today"}>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="custom">Custom Date</option>
            </SelectNative>
            <Input name="from" type="date" defaultValue={params.from ?? todayInputValue()} />
            <Input name="to" type="date" defaultValue={params.to ?? todayInputValue()} />
            <Button type="submit" size="lg">
              <Filter className="h-4 w-4" />
              Apply
            </Button>
          </form>
          <div className="mt-3">
            <ReportDownloadActions report={reportDownloadData} />
          </div>
        </CardContent>
      </Card>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Purchase</p>
            <p className="text-2xl font-semibold">{formatRupee(purchaseAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Sales</p>
            <p className="text-2xl font-semibold">{formatRupee(saleAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Collection</p>
            <p className="text-2xl font-semibold">{formatRupee(saleReceived + paymentAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Profit</p>
            <p className="text-2xl font-semibold">{formatRupee(profit)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-5">
        {isWeeklyReport ? (
          <Card>
            <CardHeader>
              <CardTitle>Weekly Sell & Buy Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="bg-muted text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Date</th>
                      <th className="px-3 py-2 text-right font-medium">Purchase / Buy</th>
                      <th className="px-3 py-2 text-right font-medium">Sales / Sell</th>
                      <th className="px-3 py-2 text-right font-medium">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weeklySellBuyRows.map((row) => (
                      <tr key={row.key} className="border-t">
                        <td className="px-3 py-2">{row.date}</td>
                        <td className="px-3 py-2 text-right">{formatRupee(row.purchase)}</td>
                        <td className="px-3 py-2 text-right">{formatRupee(row.sales)}</td>
                        <td className="px-3 py-2 text-right font-medium">{formatRupee(row.profit)}</td>
                      </tr>
                    ))}
                    <tr className="border-t bg-muted/60 font-semibold">
                      <td className="px-3 py-2">Week Total</td>
                      <td className="px-3 py-2 text-right">{formatRupee(weeklyPurchaseTotal)}</td>
                      <td className="px-3 py-2 text-right">{formatRupee(weeklySalesTotal)}</td>
                      <td className="px-3 py-2 text-right">{formatRupee(weeklySalesTotal - weeklyPurchaseTotal)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-3">
              Purchase Report
              <Badge variant="outline">{range.label}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {purchases.length ? (
              purchases.map((purchase) => (
                <div key={purchase.id} className="rounded-md border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{purchase.supplier.name}</p>
                      <p className="text-xs text-muted-foreground">{purchase.purchaseDate.toLocaleDateString("en-IN")}</p>
                    </div>
                    <p className="font-semibold">{formatRupee(decimalToNumber(purchase.totalAmount))}</p>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{purchase.items.map((item) => item.product.name).join(", ")}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No purchases in this period.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sales Report</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sales.length ? (
              sales.map((sale) => (
                <div key={sale.id} className="rounded-md border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{sale.invoiceNo}</p>
                      <p className="text-sm text-muted-foreground">{sale.customer.name}</p>
                      <p className="text-xs text-muted-foreground">{sale.invoiceDate.toLocaleDateString("en-IN")}</p>
                    </div>
                    <p className="font-semibold">{formatRupee(decimalToNumber(sale.totalAmount))}</p>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{sale.items.map((item) => item.product.name).join(", ")}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No sales in this period.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customer Outstanding Report</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {outstandingCustomers.length ? (
              outstandingCustomers.map((customer) => (
                <div key={customer.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                  <div className="min-w-0">
                    <p className="font-medium">{customer.name}</p>
                    <p className="truncate text-sm text-muted-foreground">{customer.mobile || "No mobile"}</p>
                  </div>
                  <p className="font-semibold">{formatRupee(decimalToNumber(customer.outstandingBalance))}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No outstanding customer balances.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Collection Report</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {payments.length ? (
              payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                  <div className="min-w-0">
                    <p className="font-medium">{payment.customer.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {payment.paymentMode} · {payment.paymentDate.toLocaleDateString("en-IN")}
                    </p>
                  </div>
                  <p className="font-semibold">{formatRupee(decimalToNumber(payment.amount))}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No payment collections in this period.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profit Report</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-md bg-muted p-3">
              <p className="text-sm text-muted-foreground">Sales</p>
              <p className="font-semibold">{formatRupee(saleAmount)}</p>
            </div>
            <div className="rounded-md bg-muted p-3">
              <p className="text-sm text-muted-foreground">Purchase</p>
              <p className="font-semibold">{formatRupee(purchaseAmount)}</p>
            </div>
            <div className="rounded-md bg-muted p-3">
              <p className="text-sm text-muted-foreground">Expense</p>
              <p className="font-semibold">{formatRupee(expenseAmount)}</p>
            </div>
            <div className="rounded-md bg-accent p-3 text-accent-foreground">
              <p className="text-sm text-accent-foreground/80">Profit</p>
              <p className="font-semibold">{formatRupee(profit)}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
