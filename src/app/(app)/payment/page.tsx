import { Suspense } from "react";
import { PaymentTabs } from "@/components/transactions/payment-tabs";
import { PaymentsList } from "@/components/transactions/payments-list";
import { SupplierPaymentsList } from "@/components/transactions/supplier-payments-list";
import { getCachedPaymentsPage, getCachedSupplierPaymentsPage } from "@/lib/cache/queries";
import { toPaymentReceipt } from "@/lib/payment-receipt";
import { toSupplierPaymentReceipt } from "@/lib/supplier-payment-receipt";
import { getBusinessProfile } from "@/lib/business-profile";
import { DEFAULT_PAYMENT_TAB, isPaymentTab } from "@/lib/payments/tabs";
import { getCustomerOptions, getSupplierOptions } from "@/lib/options";
import { parsePageParam } from "@/lib/pagination";
import {
  dateRangeFromFilter,
  decimalToNumber,
  DEFAULT_LIST_DATE_RANGE,
  formatDisplayDate,
  todayInputValue
} from "@/lib/utils";

type PaymentPageProps = {
  searchParams: Promise<{
    tab?: string;
    page?: string;
    range?: string;
    from?: string;
    to?: string;
    customer?: string;
    supplier?: string;
  }>;
};

export default async function PaymentPage({ searchParams }: PaymentPageProps) {
  const params = await searchParams;
  const activeTab = isPaymentTab(params.tab) ? params.tab : DEFAULT_PAYMENT_TAB;
  const page = parsePageParam(params.page);
  const range = dateRangeFromFilter(params, DEFAULT_LIST_DATE_RANGE);
  const customerId = params.customer?.trim() || undefined;
  const supplierId = params.supplier?.trim() || undefined;
  const today = todayInputValue();

  const listQuery = {
    page,
    rangeKey: params.range ?? DEFAULT_LIST_DATE_RANGE,
    from: params.from,
    to: params.to
  };

  const [customers, suppliers, profile, customerPaymentsResult, supplierPaymentsResult] = await Promise.all([
    getCustomerOptions(),
    getSupplierOptions(),
    getBusinessProfile(),
    activeTab === "customer"
      ? getCachedPaymentsPage({ ...listQuery, customerId }, range)
      : Promise.resolve({ items: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 1 } }),
    activeTab === "supplier"
      ? getCachedSupplierPaymentsPage({ ...listQuery, supplierId }, range)
      : Promise.resolve({ items: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 1 } })
  ]);

  const paymentItems =
    activeTab === "customer"
      ? customerPaymentsResult.items.map((payment) => {
          const receipt = toPaymentReceipt(payment);
          return {
            id: payment.id,
            refNo: receipt.refNo,
            paymentDate: formatDisplayDate(payment.paymentDate),
            customerName: payment.customer.name,
            paymentMode: payment.paymentMode,
            amount: decimalToNumber(payment.amount),
            notes: payment.notes ?? "",
            receipt,
            editable: {
              id: payment.id,
              customerId: payment.customerId,
              paymentDate: todayInputValue(payment.paymentDate),
              amount: decimalToNumber(payment.amount),
              paymentMode: payment.paymentMode,
              notes: payment.notes ?? ""
            }
          };
        })
      : [];

  const supplierPaymentItems =
    activeTab === "supplier"
      ? supplierPaymentsResult.items.map((payment) => {
          const receipt = toSupplierPaymentReceipt(payment);
          return {
            id: payment.id,
            refNo: receipt.refNo,
            paymentDate: formatDisplayDate(payment.paymentDate),
            supplierName: payment.supplier.name,
            paymentMode: payment.paymentMode,
            amount: decimalToNumber(payment.amount),
            notes: payment.notes ?? "",
            receipt,
            editable: {
              id: payment.id,
              supplierId: payment.supplierId,
              paymentDate: todayInputValue(payment.paymentDate),
              amount: decimalToNumber(payment.amount),
              paymentMode: payment.paymentMode,
              notes: payment.notes ?? ""
            }
          };
        })
      : [];

  return (
    <div className="app-container py-5 lg:py-8">
      <div className="mb-5 space-y-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Payments</h1>
          <p className="text-sm text-muted-foreground">Customer collections and supplier payments in one place.</p>
        </div>
        <Suspense fallback={<div className="h-10 rounded-md bg-muted" />}>
          <PaymentTabs activeTab={activeTab} />
        </Suspense>
      </div>
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading payments...</div>}>
        {activeTab === "customer" ? (
          <PaymentsList
            payments={paymentItems}
            customers={customers}
            profile={profile}
            filter={{
              range: params.range ?? DEFAULT_LIST_DATE_RANGE,
              from: params.from ?? today,
              to: params.to ?? today,
              customer: params.customer ?? ""
            }}
            filterLabel={range.label}
            pagination={customerPaymentsResult.pagination}
          />
        ) : (
          <SupplierPaymentsList
            payments={supplierPaymentItems}
            suppliers={suppliers}
            profile={profile}
            filter={{
              range: params.range ?? DEFAULT_LIST_DATE_RANGE,
              from: params.from ?? today,
              to: params.to ?? today,
              supplier: params.supplier ?? ""
            }}
            filterLabel={range.label}
            pagination={supplierPaymentsResult.pagination}
          />
        )}
      </Suspense>
    </div>
  );
}