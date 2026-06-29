import "server-only";

import { prisma } from "@/lib/prisma";
import { decimalToNumber } from "@/lib/utils";
import type { SupplierStatementDocument, SupplierStatementRow } from "@/lib/documents/types";

export async function buildSupplierStatementData(
  supplierId: string,
  from: Date,
  to: Date,
  periodLabel: string
): Promise<SupplierStatementDocument | null> {
  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId },
    select: { name: true, mobile: true, openingBalance: true, outstandingBalance: true }
  });
  if (!supplier) {
    return null;
  }

  const [priorEntry, ledgerEntries] = await Promise.all([
    prisma.supplierLedgerEntry.findFirst({
      where: { supplierId, entryDate: { lt: from } },
      orderBy: { entryDate: "desc" },
      select: { balance: true }
    }),
    prisma.supplierLedgerEntry.findMany({
      where: { supplierId, entryDate: { gte: from, lte: to } },
      orderBy: { entryDate: "asc" },
      include: {
        purchase: {
          include: { items: { include: { product: true } } }
        },
        supplierPayment: true
      }
    })
  ]);

  const openingBalance = priorEntry
    ? decimalToNumber(priorEntry.balance)
    : decimalToNumber(supplier.openingBalance);

  let totalPurchases = 0;
  let totalPayments = 0;
  const rows: SupplierStatementRow[] = ledgerEntries.map((entry) => {
    const debit = decimalToNumber(entry.debit);
    const credit = decimalToNumber(entry.credit);
    const balance = decimalToNumber(entry.balance);
    let particulars = entry.description ?? entry.type;

    if (entry.type === "PURCHASE" && entry.purchase) {
      totalPurchases += debit;
      const products = entry.purchase.items
        .map((item) => `${item.product.name} ${decimalToNumber(item.kg)}kg`)
        .join(", ");
      particulars = `Purchase${products ? ` — ${products}` : ""}`;
    } else if (entry.type === "PAYMENT" && entry.supplierPayment) {
      totalPayments += credit;
      particulars = `Payment — ${entry.supplierPayment.paymentMode}`;
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
    : decimalToNumber(supplier.outstandingBalance);

  return {
    supplier: {
      name: supplier.name,
      mobile: supplier.mobile ?? ""
    },
    periodLabel,
    from: from.toLocaleDateString("en-IN"),
    to: to.toLocaleDateString("en-IN"),
    openingBalance,
    closingBalance,
    totalPurchases,
    totalPayments,
    rows
  };
}