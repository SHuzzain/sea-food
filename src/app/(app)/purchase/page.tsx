import { PurchaseForm } from "@/components/transactions/purchase-form";
import { Card, CardContent } from "@/components/ui/card";
import { getProductOptions, getSupplierOptions } from "@/lib/options";
import { prisma } from "@/lib/prisma";
import { decimalToNumber, formatRupee, todayInputValue } from "@/lib/utils";

export default async function PurchasePage() {
  const [suppliers, products, recentPurchases] = await Promise.all([
    getSupplierOptions(),
    getProductOptions(),
    prisma.purchase.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { supplier: true, items: { include: { product: true } } }
    })
  ]);

  return (
    <div className="app-container py-5 lg:py-8">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold tracking-normal">Purchase</h1>
        <p className="text-sm text-muted-foreground">Enter supplier purchases with multiple fish items.</p>
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <PurchaseForm suppliers={suppliers} products={products} today={todayInputValue()} />
        <aside className="space-y-3">
          <h2 className="font-semibold">Recent Purchases</h2>
          {recentPurchases.length ? (
            recentPurchases.map((purchase) => (
              <Card key={purchase.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{purchase.supplier.name}</p>
                      <p className="text-xs text-muted-foreground">{purchase.purchaseDate.toLocaleDateString("en-IN")}</p>
                    </div>
                    <p className="font-semibold">{formatRupee(decimalToNumber(purchase.totalAmount))}</p>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {purchase.items.map((item) => item.product.name).join(", ")}
                  </p>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-4 text-sm text-muted-foreground">No purchases yet.</CardContent>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}
