"use server";

import { revalidatePath } from "next/cache";
import { invalidatePurchasesCache } from "@/lib/cache/invalidate";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseDateInput, toMoney, toQuantity } from "@/lib/utils";

export type PurchaseItemPayload = {
  productId: string;
  kg: number;
  rate: number;
};

export type PurchasePayload = {
  purchaseDate: string;
  supplierId: string;
  items: PurchaseItemPayload[];
};

export async function createPurchase(payload: PurchasePayload) {
  await requireUser();
  const purchaseDate = payload.purchaseDate ? parseDateInput(payload.purchaseDate) : new Date();
  const supplierId = payload.supplierId;
  const items = payload.items
    .map((item) => ({
      productId: item.productId,
      kg: toQuantity(item.kg),
      rate: toMoney(item.rate),
      amount: toMoney(toQuantity(item.kg) * toMoney(item.rate))
    }))
    .filter((item) => item.productId && item.kg > 0 && item.rate >= 0);

  if (!supplierId) {
    return { ok: false, error: "Select a supplier." };
  }
  if (!items.length) {
    return { ok: false, error: "Add at least one purchase item." };
  }

  const totalAmount = toMoney(items.reduce((sum, item) => sum + item.amount, 0));
  const purchase = await prisma.purchase.create({
    data: {
      purchaseDate,
      supplierId,
      totalAmount,
      items: { create: items }
    },
    select: { id: true }
  });

  invalidatePurchasesCache();
  revalidatePath("/");
  revalidatePath("/purchase");
  revalidatePath("/purchase/new");
  revalidatePath("/reports");
  return { ok: true, purchaseId: purchase.id, totalAmount };
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

  const existing = await prisma.purchase.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    return { ok: false, error: "Purchase not found." };
  }

  const totalAmount = toMoney(items.reduce((sum, item) => sum + item.amount, 0));
  await prisma.$transaction(async (tx) => {
    await tx.purchaseItem.deleteMany({ where: { purchaseId: id } });
    await tx.purchase.update({
      where: { id },
      data: {
        purchaseDate,
        supplierId: payload.supplierId,
        totalAmount,
        items: { create: items }
      }
    });
  });

  invalidatePurchasesCache();
  revalidatePath("/");
  revalidatePath("/purchase");
  revalidatePath("/purchase/new");
  revalidatePath("/reports");
  return { ok: true, totalAmount };
}

export async function deletePurchase(id: string) {
  await requireUser();
  const existing = await prisma.purchase.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    return { ok: false, error: "Purchase not found." };
  }

  await prisma.purchase.delete({ where: { id } });
  invalidatePurchasesCache();
  revalidatePath("/");
  revalidatePath("/purchase");
  revalidatePath("/purchase/new");
  revalidatePath("/reports");
  return { ok: true };
}
