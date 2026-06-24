"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decimalToNumber, endOfDay, parseDateInput, startOfDay, toMoney, toQuantity } from "@/lib/utils";

export type SaleItemPayload = {
  productId: string;
  kg: number;
  rate: number;
};

export type SalePayload = {
  customerId: string;
  invoiceDate: string;
  receivedAmount: number;
  items: SaleItemPayload[];
};

export type SavedSale = {
  id: string;
  invoiceNo: string;
  invoiceDate: string;
  customer: {
    name: string;
    mobile: string;
  };
  items: {
    productName: string;
    kg: number;
    rate: number;
    amount: number;
  }[];
  previousBalance: number;
  totalAmount: number;
  receivedAmount: number;
  currentBalance: number;
};

function signedMoney(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.round(value * 100) / 100;
}

async function nextInvoiceNo(invoiceDate: Date) {
  const prefix = `SF-${invoiceDate.getFullYear()}${String(invoiceDate.getMonth() + 1).padStart(2, "0")}${String(
    invoiceDate.getDate()
  ).padStart(2, "0")}`;
  const count = await prisma.sale.count({
    where: { invoiceDate: { gte: startOfDay(invoiceDate), lte: endOfDay(invoiceDate) } }
  });
  return `${prefix}-${String(count + 1).padStart(3, "0")}`;
}

export async function createSale(payload: SalePayload) {
  await requireUser();
  const invoiceDate = payload.invoiceDate ? parseDateInput(payload.invoiceDate) : new Date();
  const customer = await prisma.customer.findUnique({ where: { id: payload.customerId } });
  if (!customer) {
    return { ok: false, error: "Select a customer." };
  }

  const items = payload.items
    .map((item) => ({
      productId: item.productId,
      kg: toQuantity(item.kg),
      rate: toMoney(item.rate),
      amount: toMoney(toQuantity(item.kg) * toMoney(item.rate))
    }))
    .filter((item) => item.productId && item.kg > 0 && item.rate >= 0);

  if (!items.length) {
    return { ok: false, error: "Add at least one sale item." };
  }

  const previousBalance = decimalToNumber(customer.outstandingBalance);
  const totalAmount = toMoney(items.reduce((sum, item) => sum + item.amount, 0));
  const receivedAmount = toMoney(payload.receivedAmount);
  const currentBalance = signedMoney(previousBalance + totalAmount - receivedAmount);
  const invoiceNo = await nextInvoiceNo(invoiceDate);

  const sale = await prisma.$transaction(async (tx) => {
    const createdSale = await tx.sale.create({
      data: {
        customerId: customer.id,
        invoiceDate,
        invoiceNo,
        previousBalance,
        totalAmount,
        receivedAmount,
        currentBalance,
        items: { create: items },
        ledgerEntries: {
          create: {
            customerId: customer.id,
            entryDate: invoiceDate,
            type: "SALE",
            refNo: invoiceNo,
            description: "Sale bill",
            debit: totalAmount,
            credit: receivedAmount,
            balance: currentBalance
          }
        }
      },
      include: { customer: true, items: { include: { product: true } } }
    });

    await tx.customer.update({
      where: { id: customer.id },
      data: { outstandingBalance: currentBalance }
    });

    return createdSale;
  });

  revalidatePath("/");
  revalidatePath("/sale");
  revalidatePath("/payment");
  revalidatePath("/customers");
  revalidatePath("/reports");

  const savedSale: SavedSale = {
    id: sale.id,
    invoiceNo: sale.invoiceNo,
    invoiceDate: sale.invoiceDate.toLocaleDateString("en-IN"),
    customer: {
      name: sale.customer.name,
      mobile: sale.customer.mobile ?? ""
    },
    items: sale.items.map((item) => ({
      productName: item.product.name,
      kg: decimalToNumber(item.kg),
      rate: decimalToNumber(item.rate),
      amount: decimalToNumber(item.amount)
    })),
    previousBalance,
    totalAmount,
    receivedAmount,
    currentBalance
  };

  return { ok: true, sale: savedSale };
}
