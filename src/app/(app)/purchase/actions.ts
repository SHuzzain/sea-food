"use server";

import { revalidatePath } from "next/cache";
import { invalidatePurchasesCache, invalidateSuppliersCache } from "@/lib/cache/invalidate";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recalculateSupplierLedger } from "@/lib/supplier-ledger";
import { decimalToNumber, parseDateInput, todayInputValue, toMoney, toQuantity } from "@/lib/utils";

export type PurchaseItemPayload = {
  productId: string;
  kg: number;
  rate: number;
};

export type PurchasePayload = {
  purchaseDate: string;
  supplierId: string;
  paidAmount: number;
  items: PurchaseItemPayload[];
};

function signedMoney(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.round(value * 100) / 100;
}

function toPurchaseRef(purchaseDate: Date, id: string) {
  const datePart = todayInputValue(purchaseDate).replace(/-/g, "");
  return `PUR-${datePart}-${id.slice(-6).toUpperCase()}`;
}

export async function createPurchase(payload: PurchasePayload) {
  await requireUser();
  const purchaseDate = payload.purchaseDate ? parseDateInput(payload.purchaseDate) : new Date();
  const supplier = await prisma.supplier.findUnique({ where: { id: payload.supplierId } });
  if (!supplier) {
    return { ok: false, error: "Select a supplier." };
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
    return { ok: false, error: "Add at least one purchase item." };
  }

  const previousBalance = decimalToNumber(supplier.outstandingBalance);
  const totalAmount = toMoney(items.reduce((sum, item) => sum + item.amount, 0));
  const paidAmount = toMoney(payload.paidAmount);
  const currentBalance = signedMoney(previousBalance + totalAmount - paidAmount);

  const purchase = await prisma.$transaction(async (tx) => {
    const createdPurchase = await tx.purchase.create({
      data: {
        purchaseDate,
        supplierId: supplier.id,
        previousBalance,
        totalAmount,
        paidAmount,
        currentBalance,
        items: { create: items }
      },
      select: { id: true }
    });

    const refNo = toPurchaseRef(purchaseDate, createdPurchase.id);
    await tx.supplierLedgerEntry.create({
      data: {
        supplierId: supplier.id,
        purchaseId: createdPurchase.id,
        entryDate: purchaseDate,
        type: "PURCHASE",
        refNo,
        description: "Purchase bill",
        debit: totalAmount,
        credit: paidAmount,
        balance: currentBalance
      }
    });

    await tx.supplier.update({
      where: { id: supplier.id },
      data: { outstandingBalance: currentBalance }
    });

    return createdPurchase;
  });

  invalidatePurchasesCache();
  invalidateSuppliersCache();
  revalidatePath("/");
  revalidatePath("/purchase");
  revalidatePath("/purchase/new");
  revalidatePath("/suppliers");
  revalidatePath("/payment");
  revalidatePath("/reports");
  return { ok: true, purchaseId: purchase.id, totalAmount, paidAmount, currentBalance };
}

function normalizePurchaseItems(items: PurchaseItemPayload[]) {
  return items
    .map((item) => ({
      productId: item.productId,
      kg: toQuantity(item.kg),
      rate: toMoney(item.rate),
      amount: toMoney(toQuantity(item.kg) * toMoney(item.rate))
    }))
    .filter((item) => item.productId && item.kg > 0 && item.rate >= 0);
}

export async function updatePurchase(id: string, payload: PurchasePayload) {
  await requireUser();
  const purchaseDate = payload.purchaseDate ? parseDateInput(payload.purchaseDate) : new Date();
  const items = normalizePurchaseItems(payload.items);

  if (!payload.supplierId) {
    return { ok: false, error: "Select a supplier." };
  }
  if (!items.length) {
    return { ok: false, error: "Add at least one purchase item." };
  }

  const existing = await prisma.purchase.findUnique({
    where: { id },
    select: { id: true, supplierId: true }
  });
  if (!existing) {
    return { ok: false, error: "Purchase not found." };
  }

  const supplier = await prisma.supplier.findUnique({ where: { id: payload.supplierId } });
  if (!supplier) {
    return { ok: false, error: "Supplier not found." };
  }

  const totalAmount = toMoney(items.reduce((sum, item) => sum + item.amount, 0));
  const paidAmount = toMoney(payload.paidAmount);
  const previousSupplierId = existing.supplierId;
  const refNo = toPurchaseRef(purchaseDate, id);

  await prisma.$transaction(async (tx) => {
    await tx.purchaseItem.deleteMany({ where: { purchaseId: id } });
    await tx.purchase.update({
      where: { id },
      data: {
        purchaseDate,
        supplierId: payload.supplierId,
        totalAmount,
        paidAmount,
        items: { create: items }
      }
    });

    await tx.supplierLedgerEntry.updateMany({
      where: { purchaseId: id },
      data: {
        supplierId: payload.supplierId,
        entryDate: purchaseDate,
        debit: totalAmount,
        credit: paidAmount,
        refNo,
        description: "Purchase bill"
      }
    });

    const currentBalance = await recalculateSupplierLedger(payload.supplierId, tx);
    const previousBalance = signedMoney(currentBalance - totalAmount + paidAmount);
    await tx.purchase.update({
      where: { id },
      data: { previousBalance, currentBalance }
    });

    if (previousSupplierId !== payload.supplierId) {
      await recalculateSupplierLedger(previousSupplierId, tx);
    }
  });

  invalidatePurchasesCache();
  invalidateSuppliersCache();
  revalidatePath("/");
  revalidatePath("/purchase");
  revalidatePath("/purchase/new");
  revalidatePath("/suppliers");
  revalidatePath("/payment");
  revalidatePath("/reports");
  return { ok: true, totalAmount };
}

export async function deletePurchase(id: string) {
  await requireUser();
  const existing = await prisma.purchase.findUnique({
    where: { id },
    select: { id: true, supplierId: true }
  });
  if (!existing) {
    return { ok: false, error: "Purchase not found." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.supplierLedgerEntry.deleteMany({ where: { purchaseId: id } });
    await tx.purchase.delete({ where: { id } });
    await recalculateSupplierLedger(existing.supplierId, tx);
  });

  invalidatePurchasesCache();
  invalidateSuppliersCache();
  revalidatePath("/");
  revalidatePath("/purchase");
  revalidatePath("/purchase/new");
  revalidatePath("/suppliers");
  revalidatePath("/payment");
  revalidatePath("/reports");
  return { ok: true };
}