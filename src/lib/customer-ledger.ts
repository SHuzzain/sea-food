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

export async function recalculateCustomerLedger(customerId: string, tx?: Tx) {
  const db = tx ?? prisma;
  const customer = await db.customer.findUnique({ where: { id: customerId } });
  if (!customer) {
    return 0;
  }

  const entries = await db.ledgerEntry.findMany({
    where: { customerId },
    orderBy: [{ entryDate: "asc" }, { createdAt: "asc" }]
  });

  const hasOpeningEntry = entries.some((entry) => entry.type === "OPENING");
  let running = hasOpeningEntry ? 0 : decimalToNumber(customer.openingBalance);

  for (const entry of entries) {
    const debit = decimalToNumber(entry.debit);
    const credit = decimalToNumber(entry.credit);
    if (entry.type === "OPENING") {
      running = signedMoney(debit - credit);
    } else {
      running = signedMoney(running + debit - credit);
    }
    await db.ledgerEntry.update({
      where: { id: entry.id },
      data: { balance: running }
    });
  }

  await db.customer.update({
    where: { id: customerId },
    data: { outstandingBalance: running }
  });

  return running;
}