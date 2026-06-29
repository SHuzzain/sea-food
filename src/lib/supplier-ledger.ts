import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { decimalToNumber } from "@/lib/utils";

type Tx = Prisma.TransactionClient;

function signedMoney(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.round(value * 100) / 100;
}

export async function recalculateSupplierLedger(supplierId: string, tx?: Tx) {
  const db = tx ?? prisma;
  const supplier = await db.supplier.findUnique({ where: { id: supplierId } });
  if (!supplier) {
    return 0;
  }

  const entries = await db.supplierLedgerEntry.findMany({
    where: { supplierId },
    orderBy: [{ entryDate: "asc" }, { createdAt: "asc" }]
  });

  const hasOpeningEntry = entries.some((entry) => entry.type === "OPENING");
  let running = hasOpeningEntry ? 0 : decimalToNumber(supplier.openingBalance);

  for (const entry of entries) {
    const debit = decimalToNumber(entry.debit);
    const credit = decimalToNumber(entry.credit);
    if (entry.type === "OPENING") {
      running = signedMoney(debit - credit);
    } else {
      running = signedMoney(running + debit - credit);
    }
    await db.supplierLedgerEntry.update({
      where: { id: entry.id },
      data: { balance: running }
    });
  }

  await db.supplier.update({
    where: { id: supplierId },
    data: { outstandingBalance: running }
  });

  return running;
}