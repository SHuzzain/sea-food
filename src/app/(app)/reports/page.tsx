import { Filter } from "lucide-react";
import type { SavedSale } from "@/app/(app)/sale/actions";
import { toPaymentReceipt } from "@/lib/payment-receipt";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { CustomerStatementActions } from "@/components/reports/customer-statement-actions";
import { ReportDownloadActions, type ReportDownloadData } from "@/components/reports/report-download-actions";
import { InvoiceActions } from "@/components/transactions/invoice-actions";
import { PaymentReceiptActions } from "@/components/transactions/payment-receipt-actions";
import { getBusinessProfile } from "@/lib/business-profile";
import { buildCustomerStatementData } from "@/lib/customer-statement";
import { getCustomerOptions } from "@/lib/options";
import { prisma } from "@/lib/prisma";
import { dateRangeFromFilter, decimalToNumber, formatRupee, todayInputValue } from "@/lib/utils";
import { buildWeeklySellBuyRows } from "@/lib/weekly-sell-buy";

type ReportsPageProps = {
  searchParams: Promise<{
    range?: string;
    from?: string;
    to?: string;
    customer?: string;
  }>;
};

function toSavedSale(sale: {
  id: string;
  invoiceNo: string;
  invoiceDate: Date;
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
    invoiceDate: sale.invoiceDate.toLocaleDateString("en-IN"),
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

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const params = await searchParams;
  const range = dateRangeFromFilter(params);
  const dateWhere = { gte: range.from, lte: range.to };
  const customerId = params.customer?.trim() || undefined;
  const customerWhere = customerId ? { customerId } : {};
  const customerFiltered = Boolean(customerId);
  const outstandingWhere = {
    status: "ACTIVE" as const,
    outstandingBalance: { gt: 0 },
    ...(customerId ? { id: customerId } : {})
  };

  const [
    customers,
    profile,
    purchases,
    sales,
    outstandingCustomers,
    payments,
    purchaseTotal,
    salesTotal,
    paymentTotal,
    customerStatement
  ] = await Promise.all([
    getCustomerOptions(),
    getBusinessProfile(),
    prisma.purchase.findMany({
      where: { purchaseDate: dateWhere },
      orderBy: { purchaseDate: "desc" },
      include: { supplier: true, items: { include: { product: true } } }
    }),
    prisma.sale.findMany({
      where: { invoiceDate: dateWhere, ...customerWhere },
      orderBy: { invoiceDate: "desc" },
      include: { customer: true, items: { include: { product: true } } }
    }),
    prisma.customer.findMany({
      where: outstandingWhere,
      orderBy: { name: "asc" }
    }),
    prisma.payment.findMany({
      where: { paymentDate: dateWhere, ...customerWhere },
      orderBy: { paymentDate: "desc" },
      include: {
        customer: true,
        ledgerEntries: { take: 1, orderBy: { entryDate: "desc" } }
      }
    }),
    prisma.purchase.aggregate({ where: { purchaseDate: dateWhere }, _sum: { totalAmount: true } }),
    prisma.sale.aggregate({ where: { invoiceDate: dateWhere, ...customerWhere }, _sum: { totalAmount: true, receivedAmount: true } }),
    prisma.payment.aggregate({ where: { paymentDate: dateWhere, ...customerWhere }, _sum: { amount: true } }),
    customerId ? buildCustomerStatementData(customerId, range.from, range.to, range.label) : Promise.resolve(null)
  ]);

  const selectedCustomer = customerId ? customers.find((customer) => customer.id === customerId) : undefined;
  const filteredCustomerRecord = customerId
    ? await prisma.customer.findUnique({
        where: { id: customerId },
        select: { outstandingBalance: true }
      })
    : null;

  const purchaseAmount = decimalToNumber(purchaseTotal._sum.totalAmount);
  const saleAmount = decimalToNumber(salesTotal._sum.totalAmount);
  const saleReceived = decimalToNumber(salesTotal._sum.receivedAmount);
  const paymentAmount = decimalToNumber(paymentTotal._sum.amount);
  const outstandingAmount = customerFiltered
    ? decimalToNumber(filteredCustomerRecord?.outstandingBalance)
    : outstandingCustomers.reduce((sum, customer) => sum + decimalToNumber(customer.outstandingBalance), 0);

  const isWeeklyReport = (params.range ?? "today") === "week" && !customerFiltered;
  const weeklySellBuyRows = isWeeklyReport
    ? buildWeeklySellBuyRows(range.from, range.to, purchases, sales).map((row) => ({
        ...row,
        balance: row.profit
      }))
    : [];
  const weeklyPurchaseTotal = weeklySellBuyRows.reduce((sum, row) => sum + row.purchase, 0);
  const weeklySalesTotal = weeklySellBuyRows.reduce((sum, row) => sum + row.sales, 0);

  const reportDownloadData: ReportDownloadData = {
    label: range.label,
    from: range.from.toLocaleDateString("en-IN"),
    to: range.to.toLocaleDateString("en-IN"),
    customerName: selectedCustomer?.label,
    customerFiltered,
    business: profile,
    summary: {
      purchase: purchaseAmount,
      sales: saleAmount,
      collection: saleReceived + paymentAmount,
      outstanding: outstandingAmount
    },
    weeklySellBuy: weeklySellBuyRows,
    statement: customerStatement
      ? {
          openingBalance: customerStatement.openingBalance,
          closingBalance: customerStatement.closingBalance,
          totalSales: customerStatement.totalSales,
          totalPayments: customerStatement.totalPayments,
          rows: customerStatement.rows
        }
      : undefined,
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
    }))
  };

  return (
    <div className="app-container py-5 lg:py-8">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold tracking-normal">Reports</h1>
        <p className="text-sm text-muted-foreground">
          {customerFiltered
            ? "Customer sales, collections, outstanding and weekly statement."
            : "Purchase, sales, outstanding and collection reports."}
        </p>
      </div>

      <Card className="mb-5">
        <CardContent className="p-4">
          <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-[160px_1fr_1fr_1fr_auto]" action="/reports">
            <SelectNative name="range" defaultValue={params.range ?? "today"}>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="custom">Custom Date</option>
            </SelectNative>
            <SelectNative name="customer" defaultValue={params.customer ?? ""}>
              <option value="">All Customers</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.label}
                </option>
              ))}
            </SelectNative>
            <Input name="from" type="date" defaultValue={params.from ?? todayInputValue()} />
            <Input name="to" type="date" defaultValue={params.to ?? todayInputValue()} />
            <Button type="submit" size="lg">
              <Filter className="h-4 w-4" />
              Apply
            </Button>
          </form>
          {selectedCustomer ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Filtered for <span className="font-medium text-foreground">{selectedCustomer.label}</span>
            </p>
          ) : null}
          <div className="mt-3">
            <ReportDownloadActions report={reportDownloadData} />
          </div>
        </CardContent>
      </Card>

      <div className={`mb-5 grid gap-3 sm:grid-cols-2 ${customerFiltered ? "xl:grid-cols-3" : "xl:grid-cols-4"}`}>
        {!customerFiltered ? (
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Purchase</p>
              <p className="text-2xl font-semibold">{formatRupee(purchaseAmount)}</p>
            </CardContent>
          </Card>
        ) : null}
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
            <p className="text-sm text-muted-foreground">{customerFiltered ? "Outstanding" : "Total Outstanding"}</p>
            <p className="text-2xl font-semibold">{formatRupee(outstandingAmount)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-5">
        {customerStatement ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-3">
                Customer Statement
                <Badge variant="outline">{range.label}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CustomerStatementActions statement={customerStatement} profile={profile} />
            </CardContent>
          </Card>
        ) : null}

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
                        <td className="px-3 py-2 text-right font-medium">{formatRupee(row.balance)}</td>
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

        {!customerFiltered ? (
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
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-3">
              Sales Report
              {selectedCustomer ? <Badge variant="outline">{selectedCustomer.label}</Badge> : null}
            </CardTitle>
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
                  <div className="mt-3">
                    <InvoiceActions sale={toSavedSale(sale)} compact profile={profile} />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No sales in this period.</p>
            )}
          </CardContent>
        </Card>

        {!customerFiltered ? (
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
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Payment Collection Report</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {payments.length ? (
              payments.map((payment) => {
                const receipt = toPaymentReceipt(payment);
                return (
                  <div key={payment.id} className="rounded-md border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium">{payment.customer.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {payment.paymentMode} · {payment.paymentDate.toLocaleDateString("en-IN")}
                        </p>
                      </div>
                      <p className="font-semibold">{formatRupee(decimalToNumber(payment.amount))}</p>
                    </div>
                    <div className="mt-3">
                      <PaymentReceiptActions receipt={receipt} compact profile={profile} />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground">No payment collections in this period.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
