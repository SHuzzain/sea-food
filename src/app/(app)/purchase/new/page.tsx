import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PurchaseForm } from "@/components/transactions/purchase-form";
import { Button } from "@/components/ui/button";
import { getProductOptions, getSupplierOptions } from "@/lib/options";
import { todayInputValue } from "@/lib/utils";

export default async function NewPurchasePage() {
  const today = todayInputValue();
  const [suppliers, products] = await Promise.all([getSupplierOptions(), getProductOptions()]);

  return (
    <div className="app-container py-5 lg:py-8">
      <div className="mb-5 space-y-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
          <Link href="/purchase">
            <ArrowLeft className="h-4 w-4" />
            Back to Purchases
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">New Purchase</h1>
          <p className="text-sm text-muted-foreground">Enter a supplier purchase with multiple fish items.</p>
        </div>
      </div>
      <PurchaseForm suppliers={suppliers} products={products} today={today} />
    </div>
  );
}