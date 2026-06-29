import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PaymentForm } from "@/components/transactions/payment-form";
import { Button } from "@/components/ui/button";
import { getBusinessProfile } from "@/lib/business-profile";
import { getCustomerOptions } from "@/lib/options";
import { todayInputValue } from "@/lib/utils";

export default async function NewPaymentPage() {
  const [customers, profile] = await Promise.all([getCustomerOptions(), getBusinessProfile()]);

  return (
    <div className="app-container py-5 lg:py-8">
      <div className="mb-5 space-y-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
          <Link href="/payment">
            <ArrowLeft className="h-4 w-4" />
            Back to Payments
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">New Payment</h1>
          <p className="text-sm text-muted-foreground">Collect a customer payment and reduce their outstanding balance.</p>
        </div>
      </div>
      <PaymentForm customers={customers} today={todayInputValue()} profile={profile} />
    </div>
  );
}