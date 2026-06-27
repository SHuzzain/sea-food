import Link from "next/link";
import { ArrowRight, BarChart3, CreditCard, ShoppingBag, TrendingUp, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { decimalToNumber, endOfDay, formatRupee, startOfDay, startOfWeek } from "@/lib/utils";
import { buildWeeklySellBuyRows } from "@/lib/weekly-sell-buy";

async function sumPurchase(from: Date, to: Date) {
  const result = await prisma.purchase.aggregate({
    where: { purchaseDate: { gte: from, lte: to } },
    _sum: { totalAmount: true }
  });
  return decimalToNumber(result._sum.totalAmount);
}

async function sumSales(from: Date, to: Date) {
  const result = await prisma.sale.aggregate({
    where: { invoiceDate: { gte: from, lte: to } },
    _sum: { totalAmount: true, receivedAmount: true }
  });
  return {
    total: decimalToNumber(result._sum.totalAmount),
    received: decimalToNumber(result._sum.receivedAmount)
  };
}

async function sumPayments(from: Date, to: Date) {
  const result = await prisma.payment.aggregate({
    where: { paymentDate: { gte: from, lte: to } },
    _sum: { amount: true }
  });
  return decimalToNumber(result._sum.amount);
}

export default async function DashboardPage() {
  const now = new Date();
  const todayFrom = startOfDay(now);
  const todayTo = endOfDay(now);
  const weekFrom = startOfWeek(now);

  const [todayPurchase, todaySales, todayPayments, outstanding, weekPurchases, weekSaleRows] = await Promise.all([
    sumPurchase(todayFrom, todayTo),
    sumSales(todayFrom, todayTo),
    sumPayments(todayFrom, todayTo),
    prisma.customer.aggregate({ _sum: { outstandingBalance: true }, where: { status: "ACTIVE" } }),
    prisma.purchase.findMany({
      where: { purchaseDate: { gte: weekFrom, lte: todayTo } },
      select: { purchaseDate: true, totalAmount: true }
    }),
    prisma.sale.findMany({
      where: { invoiceDate: { gte: weekFrom, lte: todayTo } },
      select: { invoiceDate: true, totalAmount: true }
    })
  ]);

  const weeklySellBuyRows = buildWeeklySellBuyRows(weekFrom, todayTo, weekPurchases, weekSaleRows);
  const weekPurchase = weeklySellBuyRows.reduce((sum, row) => sum + row.purchase, 0);
  const weekSalesTotal = weeklySellBuyRows.reduce((sum, row) => sum + row.sales, 0);
  const weekSellBuyBalance = weekSalesTotal - weekPurchase;

  const cards = [
    { title: "Today Purchase", value: formatRupee(todayPurchase), icon: ShoppingBag, href: "/purchase" },
    { title: "Today Sales", value: formatRupee(todaySales.total), icon: TrendingUp, href: "/sale" },
    {
      title: "Today Collection",
      value: formatRupee(todaySales.received + todayPayments),
      icon: CreditCard,
      href: "/payment"
    },
    {
      title: "Customer Outstanding",
      value: formatRupee(decimalToNumber(outstanding._sum.outstandingBalance)),
      icon: Users,
      href: "/customers"
    },
    { title: "This Week Purchase", value: formatRupee(weekPurchase), icon: ShoppingBag, href: "/reports?range=week" },
    { title: "This Week Sales", value: formatRupee(weekSalesTotal), icon: BarChart3, href: "/reports?range=week" }
  ];

  return (
    <div className="app-container py-5 lg:py-8">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Home</h1>
          <p className="text-sm text-muted-foreground">Today and this week at a glance.</p>
        </div>
        <Button asChild variant="outline" className="hidden sm:inline-flex">
          <Link href="/reports">
            Reports
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.title} href={card.href}>
              <Card className="h-full transition-colors hover:border-primary/40">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
                  <Icon className="h-5 w-5 text-primary" />
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold tracking-normal">{card.value}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
      <Card className="mt-5">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>This Week Sell & Buy</CardTitle>
          <Button asChild variant="outline" size="sm">
            <Link href="/reports?range=week">
              Full Report
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
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
                    <td className="px-3 py-2 text-right font-medium">{formatRupee(row.profit)}</td>
                  </tr>
                ))}
                <tr className="border-t bg-muted/60 font-semibold">
                  <td className="px-3 py-2">Week Total</td>
                  <td className="px-3 py-2 text-right">{formatRupee(weekPurchase)}</td>
                  <td className="px-3 py-2 text-right">{formatRupee(weekSalesTotal)}</td>
                  <td className="px-3 py-2 text-right">{formatRupee(weekSellBuyBalance)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <Button asChild size="lg" className="justify-between">
          <Link href="/purchase">
            New Purchase
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <Button asChild size="lg" variant="secondary" className="justify-between">
          <Link href="/sale">
            New Sale
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="justify-between">
          <Link href="/payment">
            New Payment
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
