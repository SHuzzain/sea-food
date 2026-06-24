import { PaymentForm } from "@/components/transactions/payment-form";
import { Card, CardContent } from "@/components/ui/card";
import { getCustomerOptions } from "@/lib/options";
import { prisma } from "@/lib/prisma";
import { decimalToNumber, formatRupee, todayInputValue } from "@/lib/utils";

export default async function PaymentPage() {
  const [customers, recentPayments] = await Promise.all([
    getCustomerOptions(),
    prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { customer: true }
    })
  ]);

  return (
    <div className="app-container py-5 lg:py-8">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold tracking-normal">Payment</h1>
        <p className="text-sm text-muted-foreground">Collect customer payments and reduce outstanding balances.</p>
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <PaymentForm customers={customers} today={todayInputValue()} />
        <aside className="space-y-3">
          <h2 className="font-semibold">Recent Collections</h2>
          {recentPayments.length ? (
            recentPayments.map((payment) => (
              <Card key={payment.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{payment.customer.name}</p>
                      <p className="text-sm text-muted-foreground">{payment.paymentMode}</p>
                      <p className="text-xs text-muted-foreground">{payment.paymentDate.toLocaleDateString("en-IN")}</p>
                    </div>
                    <p className="font-semibold">{formatRupee(decimalToNumber(payment.amount))}</p>
                  </div>
                  {payment.notes ? <p className="mt-2 text-sm text-muted-foreground">{payment.notes}</p> : null}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-4 text-sm text-muted-foreground">No collections yet.</CardContent>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}
