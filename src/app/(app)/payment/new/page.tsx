import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { PaymentForm } from "@/components/transactions/payment-form";
import { PaymentTabs } from "@/components/transactions/payment-tabs";
import { SupplierPaymentForm } from "@/components/transactions/supplier-payment-form";
import { Button } from "@/components/ui/button";
import { getBusinessProfile } from "@/lib/business-profile";
import { DEFAULT_PAYMENT_TAB, isPaymentTab } from "@/lib/payments/tabs";
import { getCustomerOptions, getSupplierOptions } from "@/lib/options";
import { todayInputValue } from "@/lib/utils";

type NewPaymentPageProps = {
  searchParams: Promise<{
    tab?: string;
  }>;
};

export default async function NewPaymentPage({ searchParams }: NewPaymentPageProps) {
  const params = await searchParams;
  const activeTab = isPaymentTab(params.tab) ? params.tab : DEFAULT_PAYMENT_TAB;
  const today = todayInputValue();

  const [customers, suppliers, profile] = await Promise.all([
    getCustomerOptions(),
    getSupplierOptions(),
    getBusinessProfile()
  ]);

  return (
    <div className="app-container py-5 lg:py-8">
      <div className="mb-5 space-y-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
          <Link href={activeTab === "supplier" ? "/payment?tab=supplier" : "/payment"}>
            <ArrowLeft className="h-4 w-4" />
            Back to Payments
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">New Payment</h1>
          <p className="text-sm text-muted-foreground">
            {activeTab === "supplier"
              ? "Pay a supplier and reduce their outstanding balance."
              : "Collect a customer payment and reduce their outstanding balance."}
          </p>
        </div>
        <Suspense fallback={<div className="h-10 rounded-md bg-muted" />}>
          <PaymentTabs activeTab={activeTab} basePath="/payment/new" />
        </Suspense>
      </div>
      {activeTab === "supplier" ? (
        <SupplierPaymentForm suppliers={suppliers} today={today} profile={profile} />
      ) : (
        <PaymentForm customers={customers} today={today} profile={profile} />
      )}
    </div>
  );
}