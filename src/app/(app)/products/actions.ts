"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type ProductPayload = {
  name: string;
  unit?: string;
  status?: "ACTIVE" | "INACTIVE";
};

function cleanProduct(payload: ProductPayload) {
  return {
    name: payload.name.trim(),
    unit: payload.unit?.trim() || "kg",
    status: payload.status === "INACTIVE" ? "INACTIVE" : "ACTIVE"
  } as const;
}

export async function createProduct(payload: ProductPayload) {
  await requireUser();
  const data = cleanProduct(payload);
  if (!data.name) {
    return { ok: false, error: "Product name is required." };
  }

  const product = await prisma.product.create({
    data,
    select: { id: true, name: true, unit: true }
  });

  revalidatePath("/products");
  return { ok: true, product: { id: product.id, label: product.name, meta: product.unit, unit: product.unit } };
}

export async function updateProduct(id: string, payload: ProductPayload) {
  await requireUser();
  const data = cleanProduct(payload);
  if (!data.name) {
    return { ok: false, error: "Product name is required." };
  }
  await prisma.product.update({ where: { id }, data });
  revalidatePath("/products");
  return { ok: true };
}

export async function deleteProduct(id: string) {
  await requireUser();
  try {
    await prisma.product.delete({ where: { id } });
  } catch {
    await prisma.product.update({ where: { id }, data: { status: "INACTIVE" } });
  }
  revalidatePath("/products");
  return { ok: true };
}
