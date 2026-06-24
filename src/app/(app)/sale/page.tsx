import { SaleForm } from "@/components/transactions/sale-form";
import { Card, CardContent } from "@/components/ui/card";
import { getCustomerOptions, getProductOptions } from "@/lib/options";
import { prisma } from "@/lib/prisma";
import { decimalToNumber, formatRupee, todayInputValue } from "@/lib/utils";

export default async function SalePage() {
  const [customers, products, recentSales] = await Promise.all([
    getCustomerOptions(),
    getProductOptions(),
    prisma.sale.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { customer: true, items: { include: { product: true } } }
    })
  ]);

  return (
    <div className="app-container py-5 lg:py-8">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold tracking-normal">Sale</h1>
        <p className="text-sm text-muted-foreground">Create mobile-friendly sale bills and share invoices.</p>
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <SaleForm customers={customers} products={products} today={todayInputValue()} />
        <aside className="space-y-3">
          <h2 className="font-semibold">Recent Sales</h2>
          {recentSales.length ? (
            recentSales.map((sale) => (
              <Card key={sale.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{sale.invoiceNo}</p>
                      <p className="text-sm text-muted-foreground">{sale.customer.name}</p>
                      <p className="text-xs text-muted-foreground">{sale.invoiceDate.toLocaleDateString("en-IN")}</p>
                    </div>
                    <p className="font-semibold">{formatRupee(decimalToNumber(sale.totalAmount))}</p>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{sale.items.map((item) => item.product.name).join(", ")}</p>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-4 text-sm text-muted-foreground">No sales yet.</CardContent>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}
