import "server-only";

import { prisma } from "@/lib/prisma";
import { decimalToNumber } from "@/lib/utils";
import type { CustomerStatementDocument, CustomerStatementRow } from "@/lib/documents/types";

export async function buildCustomerStatementData(
  customerId: string,
  from: Date,
  to: Date,
  periodLabel: string
): Promise<CustomerStatementDocument | null> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { name: true, mobile: true, openingBalance: true, outstandingBalance: true }
  });
  if (!customer) {
    return null;
  }

  const [priorEntry, ledgerEntries] = await Promise.all([
    prisma.ledgerEntry.findFirst({
      where: { customerId, entryDate: { lt: from } },
      orderBy: { entryDate: "desc" },
      select: { balance: true }
    }),
    prisma.ledgerEntry.findMany({
      where: { customerId, entryDate: { gte: from, lte: to } },
      orderBy: { entryDate: "asc" },
      include: {
        sale: {
          include: { items: { include: { product: true } } }
        },
        payment: true
      }
    })
  ]);

  const openingBalance = priorEntry
    ? decimalToNumber(priorEntry.balance)
    : decimalToNumber(customer.openingBalance);

  let totalSales = 0;
  let totalPayments = 0;
  const rows: CustomerStatementRow[] = ledgerEntries.map((entry) => {
    const debit = decimalToNumber(entry.debit);
    const credit = decimalToNumber(entry.credit);
    const balance = decimalToNumber(entry.balance);
    let particulars = entry.description ?? entry.type;

    if (entry.type === "SALE" && entry.sale) {
      totalSales += debit;
      const products = entry.sale.items.map((item) => `${item.product.name} ${decimalToNumber(item.kg)}kg`).join(", ");
      particulars = `${entry.sale.invoiceNo}${products ? ` — ${products}` : ""}`;
    } else if (entry.type === "PAYMENT" && entry.payment) {
      totalPayments += credit;
      particulars = `Payment — ${entry.payment.paymentMode}`;
    } else if (entry.type === "OPENING") {
      particulars = "Opening Balance";
    }

    return {
      date: entry.entryDate.toLocaleDateString("en-IN"),
      particulars,
      debit,
      credit,
      balance
    };
  });

  const closingBalance = rows.length
    ? rows[rows.length - 1].balance
    : decimalToNumber(customer.outstandingBalance);

  return {
    customer: {
      name: customer.name,
      mobile: customer.mobile ?? ""
    },
    periodLabel,
    from: from.toLocaleDateString("en-IN"),
    to: to.toLocaleDateString("en-IN"),
    openingBalance,
    closingBalance,
    totalSales,
    totalPayments,
    rows
  };
}
