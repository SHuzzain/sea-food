"use server";

import { revalidatePath } from "next/cache";
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

  revalidatePath("/");
  revalidatePath("/purchase");
  revalidatePath("/reports");
  return { ok: true, purchaseId: purchase.id, totalAmount };
}
