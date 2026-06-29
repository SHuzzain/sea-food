import { Suspense } from "react";
import type { SavedSale } from "@/app/(app)/sale/actions";
import { toPaymentReceipt } from "@/lib/payment-receipt";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomerStatementActions } from "@/components/reports/customer-statement-actions";
import { SupplierStatementActions } from "@/components/reports/supplier-statement-actions";
import { ReportFilterForm } from "@/components/reports/report-filter-form";
import { ReportTabs } from "@/components/reports/report-tabs";
import { DEFAULT_REPORT_TAB, isReportTab, type ReportTab } from "@/lib/reports/tabs";
import { SectionReportActions } from "@/components/reports/section-report-actions";
import { InvoiceActions } from "@/components/transactions/invoice-actions";
import { PaymentReceiptActions } from "@/components/transactions/payment-receipt-actions";
import { PurchaseActions } from "@/components/transactions/purchase-actions";
import { getBusinessProfile } from "@/lib/business-profile";
import { buildCustomerStatementData } from "@/lib/customer-statement";
import { buildSupplierStatementData } from "@/lib/supplier-statement";
import { getCustomerOptions, getProductOptions, getSupplierOptions } from "@/lib/options";
import { prisma } from "@/lib/prisma";
import {
  dateRangeFromFilter,
  decimalToNumber,
  DEFAULT_DATE_RANGE,
  endOfDay,
  formatReportMoney,
  formatRupee,
  startOfWeek,
  todayInputValue
} from "@/lib/utils";
import { pdfMoney } from "@/lib/documents/pdf-utils";
import { buildWeeklySellBuyRows } from "@/lib/weekly-sell-buy";

type ReportsPageProps = {
  searchParams: Promise<{
    tab?: string;
    range?: string;
    from?: string;
    to?: string;
    customer?: string;
    supplier?: string;
    product?: string;
  }>;
};

type TransactionItem = {
  productId: string;
  product: { name: string };
  amount: { toString(): string };
  kg: { toString(): string };
  rate: { toString(): string };
};

function filteredItems<T extends { productId: string }>(items: T[], productId?: string) {
  return productId ? items.filter((item) => item.productId === productId) : items;
}

function sumItemAmounts(items: Array<{ amount: { toString(): string } }>) {
  return items.reduce((sum, item) => sum + decimalToNumber(item.amount), 0);
}

function sumItemKg(items: TransactionItem[], productId?: string) {
  return filteredItems(items, productId).reduce((sum, item) => sum + decimalToNumber(item.kg), 0);
}

function formatReportKg(kg: number) {
  return Number(kg || 0)
    .toLocaleString("en-IN", { maximumFractionDigits: 3 })
    .replace(/\.?0+$/, "");
}

function formatBlendedRate(amount: number, kg: number) {
  if (!kg) {
    return "-";
  }
  return formatReportMoney(amount / kg);
}

function productNames(items: TransactionItem[], productId?: string) {
  return filteredItems(items, productId)
    .map((item) => item.product.name)
    .join(", ");
}

function toPurchaseRef(purchaseDate: Date, id: string) {
  const datePart = purchaseDate.toISOString().slice(0, 10).replace(/-/g, "");
  return `PUR-${datePart}-${id.slice(-6).toUpperCase()}`;
}

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
  const activeTab: ReportTab = isReportTab(params.tab) ? params.tab : DEFAULT_REPORT_TAB;
  const range = dateRangeFromFilter(params);
  const from = range.from ?? startOfWeek(new Date());
  const to = range.to ?? endOfDay(new Date());
  const dateWhere = { gte: from, lte: to };
  const customerId = params.customer?.trim() || undefined;
  const supplierId = params.supplier?.trim() || undefined;
  const productId = params.product?.trim() || undefined;
  const customerWhere = customerId ? { customerId } : {};
  const customerFiltered = Boolean(customerId);
  const purchaseWhere = {
    purchaseDate: dateWhere,
    ...(supplierId ? { supplierId } : {}),
    ...(productId ? { items: { some: { productId } } } : {})
  };
  const saleWhere = {
    invoiceDate: dateWhere,
    ...customerWhere,
    ...(productId ? { items: { some: { productId } } } : {})
  };
  const outstandingWhere = {
    status: "ACTIVE" as const,
    outstandingBalance: { gt: 0 },
    ...(customerId ? { id: customerId } : {})
  };

  const [
    customers,
    suppliers,
    products,
    profile,
    purchases,
    sales,
    outstandingCustomers,
    payments,
    purchaseTotal,
    salesTotal,
    paymentTotal,
    customerStatement,
    supplierStatement
  ] = await Promise.all([
    getCustomerOptions(),
    getSupplierOptions(),
    getProductOptions(),
    getBusinessProfile(),
    prisma.purchase.findMany({
      where: purchaseWhere,
      orderBy: { purchaseDate: "desc" },
      include: { supplier: true, items: { include: { product: true } } }
    }),
    prisma.sale.findMany({
      where: saleWhere,
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
    prisma.purchase.aggregate({ where: purchaseWhere, _sum: { totalAmount: true, paidAmount: true } }),
    prisma.sale.aggregate({ where: saleWhere, _sum: { totalAmount: true, receivedAmount: true } }),
    prisma.payment.aggregate({ where: { paymentDate: dateWhere, ...customerWhere }, _sum: { amount: true } }),
    customerId ? buildCustomerStatementData(customerId, from, to, range.label) : Promise.resolve(null),
    supplierId ? buildSupplierStatementData(supplierId, from, to, range.label) : Promise.resolve(null)
  ]);

  const selectedCustomer = customerId ? customers.find((customer) => customer.id === customerId) : undefined;
  const selectedSupplier = supplierId ? suppliers.find((supplier) => supplier.id === supplierId) : undefined;
  const selectedProduct = productId ? products.find((product) => product.id === productId) : undefined;
  const filteredCustomerRecord = customerId
    ? await prisma.customer.findUnique({
        where: { id: customerId },
        select: { outstandingBalance: true }
      })
    : null;

  const purchaseAmount = productId
    ? purchases.reduce((sum, purchase) => sum + sumItemAmounts(filteredItems(purchase.items, productId)), 0)
    : decimalToNumber(purchaseTotal._sum.totalAmount);
  const purchasePaid = productId
    ? purchases.reduce((sum, purchase) => {
        const purchaseTotalAmount = decimalToNumber(purchase.totalAmount);
        const filteredTotal = sumItemAmounts(filteredItems(purchase.items, productId));
        if (!purchaseTotalAmount) {
          return sum;
        }
        const ratio = filteredTotal / purchaseTotalAmount;
        return sum + decimalToNumber(purchase.paidAmount) * ratio;
      }, 0)
    : decimalToNumber(purchaseTotal._sum.paidAmount);
  const saleAmount = productId
    ? sales.reduce((sum, sale) => sum + sumItemAmounts(filteredItems(sale.items, productId)), 0)
    : decimalToNumber(salesTotal._sum.totalAmount);
  const saleReceived = productId
    ? sales.reduce((sum, sale) => {
        const saleTotal = decimalToNumber(sale.totalAmount);
        const filteredTotal = sumItemAmounts(filteredItems(sale.items, productId));
        if (!saleTotal) {
          return sum;
        }
        const ratio = filteredTotal / saleTotal;
        return sum + decimalToNumber(sale.receivedAmount) * ratio;
      }, 0)
    : decimalToNumber(salesTotal._sum.receivedAmount);
  const paymentAmount = decimalToNumber(paymentTotal._sum.amount);
  const outstandingAmount = customerFiltered
    ? decimalToNumber(filteredCustomerRecord?.outstandingBalance)
    : outstandingCustomers.reduce((sum, customer) => sum + decimalToNumber(customer.outstandingBalance), 0);

  const isWeeklyReport =
    (params.range ?? DEFAULT_DATE_RANGE) === "week" && !customerFiltered && !supplierId && !productId;
  const weeklySellBuyRows = isWeeklyReport
    ? buildWeeklySellBuyRows(from, to, purchases, sales).map((row) => ({
        ...row,
        balance: row.profit
      }))
    : [];
  const weeklyPurchaseTotal = weeklySellBuyRows.reduce((sum, row) => sum + row.purchase, 0);
  const weeklySalesTotal = weeklySellBuyRows.reduce((sum, row) => sum + row.sales, 0);

  const periodFrom = from.toLocaleDateString("en-IN");
  const periodTo = to.toLocaleDateString("en-IN");

  const purchaseSection = {
    title: "Purchase Report",
    periodLabel: range.label,
    from: periodFrom,
    to: periodTo,
    metaLines: [
      ...(selectedSupplier ? [{ label: "Supplier", value: selectedSupplier.label }] : []),
      ...(selectedProduct ? [{ label: "Product", value: selectedProduct.label }] : [])
    ],
    openingBalance: supplierStatement ? supplierStatement.openingBalance : undefined,
    head: ["Date", "Supplier", "Products", "Kg", "Rate", "Amount", "Paid"],
    rows: purchases.map((purchase) => {
      const visibleItems = filteredItems(purchase.items, productId);
      const amount = productId ? sumItemAmounts(visibleItems) : decimalToNumber(purchase.totalAmount);
      const kg = sumItemKg(purchase.items, productId);
      const paid = productId
        ? (() => {
            const purchaseTotalAmount = decimalToNumber(purchase.totalAmount);
            return purchaseTotalAmount ? decimalToNumber(purchase.paidAmount) * (amount / purchaseTotalAmount) : 0;
          })()
        : decimalToNumber(purchase.paidAmount);

      return [
        purchase.purchaseDate.toLocaleDateString("en-IN"),
        purchase.supplier.name,
        productNames(purchase.items, productId),
        formatReportKg(kg),
        formatBlendedRate(amount, kg),
        formatReportMoney(amount),
        formatReportMoney(paid)
      ];
    }),
    totalRow: [
      "Total",
      "",
      "",
      formatReportKg(purchases.reduce((sum, purchase) => sum + sumItemKg(purchase.items, productId), 0)),
      "",
      formatReportMoney(purchaseAmount),
      formatReportMoney(purchasePaid)
    ],
    summaryRows: [
      { label: "Previous Balance", value: pdfMoney(supplierStatement?.openingBalance ?? 0) },
      { label: "Total Amount", value: pdfMoney(purchaseAmount) },
      { label: "Paid Amount", value: pdfMoney(purchasePaid) },
      {
        label: "Current Balance",
        value: pdfMoney(supplierStatement?.closingBalance ?? purchaseAmount - purchasePaid)
      }
    ]
  };

  const salesSection = {
    title: "Sales Report",
    periodLabel: range.label,
    from: periodFrom,
    to: periodTo,
    metaLines: [
      ...(selectedCustomer ? [{ label: "Customer", value: selectedCustomer.label }] : []),
      ...(selectedProduct ? [{ label: "Product", value: selectedProduct.label }] : [])
    ],
    openingBalance: customerStatement ? customerStatement.openingBalance : undefined,
    head: ["Date", "Invoice", "Customer", "Products", "Kg", "Rate", "Amount", "Received"],
    rows: sales.map((sale) => {
      const amount = productId ? sumItemAmounts(filteredItems(sale.items, productId)) : decimalToNumber(sale.totalAmount);
      const kg = sumItemKg(sale.items, productId);
      const received = productId
        ? (() => {
            const saleTotal = decimalToNumber(sale.totalAmount);
            return saleTotal ? decimalToNumber(sale.receivedAmount) * (amount / saleTotal) : 0;
          })()
        : decimalToNumber(sale.receivedAmount);

      return [
        sale.invoiceDate.toLocaleDateString("en-IN"),
        sale.invoiceNo,
        sale.customer.name,
        productNames(sale.items, productId),
        formatReportKg(kg),
        formatBlendedRate(amount, kg),
        formatReportMoney(amount),
        formatReportMoney(received)
      ];
    }),
    totalRow: [
      "Total",
      "",
      "",
      "",
      formatReportKg(sales.reduce((sum, sale) => sum + sumItemKg(sale.items, productId), 0)),
      "",
      formatReportMoney(saleAmount),
      formatReportMoney(saleReceived)
    ],
    summaryRows: [
      { label: "Previous Balance", value: pdfMoney(customerStatement?.openingBalance ?? 0) },
      { label: "Total Amount", value: pdfMoney(saleAmount) },
      { label: "Received Amount", value: pdfMoney(saleReceived) },
      {
        label: "Current Balance",
        value: pdfMoney(customerStatement?.closingBalance ?? saleAmount - saleReceived)
      }
    ]
  };

  const outstandingSection = {
    title: "Customer Outstanding Report",
    periodLabel: activeTab === "outstanding" ? "Current" : range.label,
    from: activeTab === "outstanding" ? "—" : periodFrom,
    to: activeTab === "outstanding" ? "—" : periodTo,
    metaLines: selectedCustomer ? [{ label: "Customer", value: selectedCustomer.label }] : [],
    head: ["Customer", "Mobile", "Balance"],
    rows: outstandingCustomers.map((customer) => [
      customer.name,
      customer.mobile || "-",
      formatReportMoney(decimalToNumber(customer.outstandingBalance))
    ]),
    totalRow: ["Total Outstanding", "", formatReportMoney(outstandingAmount)],
    summaryRows: [{ label: "Total Outstanding", value: formatRupee(outstandingAmount) }]
  };

  const paymentSection = {
    title: "Payment Collection Report",
    periodLabel: range.label,
    from: periodFrom,
    to: periodTo,
    metaLines: selectedCustomer ? [{ label: "Customer", value: selectedCustomer.label }] : [],
    head: ["Date", "Customer", "Mode", "Amount"],
    rows: payments.map((payment) => [
      payment.paymentDate.toLocaleDateString("en-IN"),
      payment.customer.name,
      payment.paymentMode,
      formatReportMoney(decimalToNumber(payment.amount))
    ]),
    totalRow: ["Total Collection", "", "", formatReportMoney(paymentAmount)],
    summaryRows: [{ label: "Total Collection", value: formatRupee(paymentAmount) }]
  };

  const tabSummary =
    activeTab === "purchase"
      ? { label: "Total Purchase", value: purchaseAmount }
      : activeTab === "sales"
        ? { label: "Total Sales", value: saleAmount }
        : activeTab === "outstanding"
          ? { label: "Total Outstanding", value: outstandingAmount }
          : { label: "Total Collection", value: paymentAmount };

  const activeFilters = [
    activeTab !== "outstanding" ? range.label : null,
    selectedCustomer?.label ?? null,
    selectedSupplier?.label ?? null,
    selectedProduct?.label ?? null
  ].filter(Boolean);

  return (
    <div className="app-container py-5 lg:py-8">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold tracking-normal">Reports</h1>
        <p className="text-sm text-muted-foreground">Choose a report tab and apply filters for that section only.</p>
      </div>

      <Card className="mb-5">
        <CardContent className="space-y-4 p-4">
          <Suspense fallback={<div className="h-10 rounded-md bg-muted" />}>
            <ReportTabs activeTab={activeTab} />
          </Suspense>
          <ReportFilterForm
            tab={activeTab}
            range={params.range ?? DEFAULT_DATE_RANGE}
            customer={params.customer ?? ""}
            supplier={params.supplier ?? ""}
            product={params.product ?? ""}
            from={params.from ?? todayInputValue()}
            to={params.to ?? params.from ?? todayInputValue()}
            customers={customers}
            suppliers={suppliers}
            products={products}
          />
          {activeFilters.length ? (
            <p className="text-sm text-muted-foreground">
              Filtered for <span className="font-medium text-foreground">{activeFilters.join(" · ")}</span>
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="mb-5">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">{tabSummary.label}</p>
          <p className="text-2xl font-semibold">{formatRupee(tabSummary.value)}</p>
        </CardContent>
      </Card>

      <div className="space-y-5">
        {activeTab === "purchase" ? (
          <>
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

            {supplierStatement ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-3">
                    Supplier Statement
                    <Badge variant="outline">{range.label}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <SupplierStatementActions statement={supplierStatement} profile={profile} />
                </CardContent>
              </Card>
            ) : null}

            <Card>
              <CardHeader className="space-y-3">
                <CardTitle className="flex items-center justify-between gap-3">
                  Purchase Report
                  {selectedSupplier ? <Badge variant="outline">{selectedSupplier.label}</Badge> : <Badge variant="outline">{range.label}</Badge>}
                </CardTitle>
                <SectionReportActions section={purchaseSection} profile={profile} compact showSummary />
              </CardHeader>
              <CardContent className="space-y-3">
                {purchases.length ? (
                  purchases.map((purchase) => {
                  const refNo = toPurchaseRef(purchase.purchaseDate, purchase.id);
                  const purchaseDate = purchase.purchaseDate.toLocaleDateString("en-IN");
                  const visibleItems = filteredItems(purchase.items, productId);
                  const items = visibleItems.map((item) => ({
                    productName: item.product.name,
                    kg: decimalToNumber(item.kg),
                    rate: decimalToNumber(item.rate),
                    amount: decimalToNumber(item.amount)
                  }));
                  const displayAmount = productId ? sumItemAmounts(visibleItems) : decimalToNumber(purchase.totalAmount);
                  const displayPaid = productId
                    ? (() => {
                        const purchaseTotalAmount = decimalToNumber(purchase.totalAmount);
                        return purchaseTotalAmount
                          ? decimalToNumber(purchase.paidAmount) * (displayAmount / purchaseTotalAmount)
                          : 0;
                      })()
                    : decimalToNumber(purchase.paidAmount);

                  return (
                    <div key={purchase.id} className="rounded-md border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium">{purchase.supplier.name}</p>
                          <p className="text-xs text-muted-foreground">{purchaseDate}</p>
                        </div>
                        <div className="flex items-start gap-1">
                          <p className="font-semibold">{formatRupee(displayAmount)}</p>
                          <PurchaseActions
                            purchase={{
                              refNo,
                              purchaseDate,
                              supplier: {
                                name: purchase.supplier.name,
                                mobile: purchase.supplier.mobile ?? ""
                              },
                              items,
                              previousBalance: decimalToNumber(purchase.previousBalance),
                              totalAmount: displayAmount,
                              paidAmount: displayPaid,
                              currentBalance: decimalToNumber(purchase.currentBalance)
                            }}
                            profile={profile}
                            compact
                            editable={{
                              id: purchase.id,
                              purchaseDate: todayInputValue(purchase.purchaseDate),
                              supplierId: purchase.supplierId,
                              paidAmount: decimalToNumber(purchase.paidAmount),
                              items: purchase.items.map((item) => ({
                                productId: item.productId,
                                kg: decimalToNumber(item.kg),
                                rate: decimalToNumber(item.rate)
                              }))
                            }}
                            suppliers={suppliers}
                            products={products}
                          />
                        </div>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{productNames(purchase.items, productId)}</p>
                      <div className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                        <p>Previous Balance: {formatRupee(decimalToNumber(purchase.previousBalance))}</p>
                        <p>Paid: {formatRupee(displayPaid)}</p>
                        <p>Current Balance: {formatRupee(decimalToNumber(purchase.currentBalance))}</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground">No purchases in this period.</p>
              )}
            </CardContent>
            </Card>
          </>
        ) : null}

        {activeTab === "sales" ? (
          <>
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

            <Card>
              <CardHeader className="space-y-3">
                <CardTitle className="flex items-center justify-between gap-3">
                  Sales Report
                  {selectedCustomer ? <Badge variant="outline">{selectedCustomer.label}</Badge> : <Badge variant="outline">{range.label}</Badge>}
                </CardTitle>
                <SectionReportActions section={salesSection} profile={profile} compact showSummary />
              </CardHeader>
              <CardContent className="space-y-3">
                {sales.length ? (
                  sales.map((sale) => {
                    const displayAmount = productId
                      ? sumItemAmounts(filteredItems(sale.items, productId))
                      : decimalToNumber(sale.totalAmount);
                    const displayReceived = productId
                      ? (() => {
                          const saleTotal = decimalToNumber(sale.totalAmount);
                          return saleTotal ? decimalToNumber(sale.receivedAmount) * (displayAmount / saleTotal) : 0;
                        })()
                      : decimalToNumber(sale.receivedAmount);

                    return (
                      <div key={sale.id} className="rounded-md border p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium">{sale.invoiceNo}</p>
                            <p className="text-sm text-muted-foreground">{sale.customer.name}</p>
                            <p className="text-xs text-muted-foreground">{sale.invoiceDate.toLocaleDateString("en-IN")}</p>
                          </div>
                          <div className="flex items-start gap-1">
                            <p className="font-semibold">{formatRupee(displayAmount)}</p>
                            <InvoiceActions
                              sale={toSavedSale(sale)}
                              compact
                              profile={profile}
                              editable={{
                                id: sale.id,
                                invoiceNo: sale.invoiceNo,
                                invoiceDate: todayInputValue(sale.invoiceDate),
                                customerId: sale.customerId,
                                receivedAmount: decimalToNumber(sale.receivedAmount),
                                items: sale.items.map((item) => ({
                                  productId: item.productId,
                                  kg: decimalToNumber(item.kg),
                                  rate: decimalToNumber(item.rate)
                                }))
                              }}
                              customers={customers}
                              products={products}
                            />
                          </div>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">{productNames(sale.items, productId)}</p>
                        <div className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                          <p>Previous Balance: {formatRupee(decimalToNumber(sale.previousBalance))}</p>
                          <p>Received: {formatRupee(displayReceived)}</p>
                          <p>Current Balance: {formatRupee(decimalToNumber(sale.currentBalance))}</p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-muted-foreground">No sales in this period.</p>
                )}
              </CardContent>
            </Card>
          </>
        ) : null}

        {activeTab === "outstanding" ? (
          <Card>
            <CardHeader className="space-y-3">
              <CardTitle className="flex items-center justify-between gap-3">
                Customer Outstanding Report
                {selectedCustomer ? <Badge variant="outline">{selectedCustomer.label}</Badge> : null}
              </CardTitle>
              <SectionReportActions section={outstandingSection} profile={profile} compact />
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

        {activeTab === "payment" ? (
          <Card>
            <CardHeader className="space-y-3">
              <CardTitle className="flex items-center justify-between gap-3">
                Payment Collection Report
                {selectedCustomer ? <Badge variant="outline">{selectedCustomer.label}</Badge> : <Badge variant="outline">{range.label}</Badge>}
              </CardTitle>
              <SectionReportActions section={paymentSection} profile={profile} compact />
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
                        <div className="flex items-center gap-1">
                          <p className="font-semibold">{formatRupee(decimalToNumber(payment.amount))}</p>
                          <PaymentReceiptActions
                            receipt={receipt}
                            compact
                            profile={profile}
                            editable={{
                              id: payment.id,
                              customerId: payment.customerId,
                              paymentDate: todayInputValue(payment.paymentDate),
                              amount: decimalToNumber(payment.amount),
                              paymentMode: payment.paymentMode,
                              notes: payment.notes ?? ""
                            }}
                            customers={customers}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground">No payment collections in this period.</p>
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
