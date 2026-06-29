import { Suspense } from "react";
import { PaymentsList } from "@/components/transactions/payments-list";
import { getCachedPaymentsPage } from "@/lib/cache/queries";
import { toPaymentReceipt } from "@/lib/payment-receipt";
import { getBusinessProfile } from "@/lib/business-profile";
import { getCustomerOptions } from "@/lib/options";
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
    page?: string;
    range?: string;
    from?: string;
    to?: string;
    customer?: string;
  }>;
};

export default async function PaymentPage({ searchParams }: PaymentPageProps) {
  const params = await searchParams;
  const page = parsePageParam(params.page);
  const range = dateRangeFromFilter(params, DEFAULT_LIST_DATE_RANGE);
  const customerId = params.customer?.trim() || undefined;
  const today = todayInputValue();

  const [customers, profile, paymentsResult] = await Promise.all([
    getCustomerOptions(),
    getBusinessProfile(),
    getCachedPaymentsPage(
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

  const paymentItems = paymentsResult.items.map((payment) => {
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
  });

  return (
    <div className="app-container py-5 lg:py-8">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold tracking-normal">Payments</h1>
        <p className="text-sm text-muted-foreground">View customer collections, filter by date, and share receipts.</p>
      </div>
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading payments...</div>}>
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
          pagination={paymentsResult.pagination}
        />
      </Suspense>
    </div>
  );
}