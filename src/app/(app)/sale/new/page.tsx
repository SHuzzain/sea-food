import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SaleForm } from "@/components/transactions/sale-form";
import { Button } from "@/components/ui/button";
import { getBusinessProfile } from "@/lib/business-profile";
import { getCustomerOptions, getProductOptions } from "@/lib/options";
import { todayInputValue } from "@/lib/utils";

export default async function NewSalePage() {
  const today = todayInputValue();
  const [customers, products, profile] = await Promise.all([
    getCustomerOptions(),
    getProductOptions(),
    getBusinessProfile()
  ]);

  return (
    <div className="app-container py-5 lg:py-8">
      <div className="mb-5 space-y-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
          <Link href="/sale">
            <ArrowLeft className="h-4 w-4" />
            Back to Sales
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">New Sale</h1>
          <p className="text-sm text-muted-foreground">Create a sale bill and share the invoice with your customer.</p>
        </div>
      </div>
      <SaleForm customers={customers} products={products} today={today} profile={profile} />
    </div>
  );
}