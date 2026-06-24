"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type SupplierPayload = {
  name: string;
  mobile?: string;
  address?: string;
  status?: "ACTIVE" | "INACTIVE";
};

function cleanSupplier(payload: SupplierPayload) {
  return {
    name: payload.name.trim(),
    mobile: payload.mobile?.trim() || "",
    address: payload.address?.trim() || "",
    status: payload.status === "INACTIVE" ? "INACTIVE" : "ACTIVE"
  } as const;
}

export async function createSupplier(payload: SupplierPayload) {
  await requireUser();
  const data = cleanSupplier(payload);
  if (!data.name) {
    return { ok: false, error: "Supplier name is required." };
  }

  const supplier = await prisma.supplier.create({
    data,
    select: { id: true, name: true, mobile: true }
  });

  revalidatePath("/suppliers");
  return { ok: true, supplier: { id: supplier.id, label: supplier.name, meta: supplier.mobile ?? "" } };
}

export async function updateSupplier(id: string, payload: SupplierPayload) {
  await requireUser();
  const data = cleanSupplier(payload);
  if (!data.name) {
    return { ok: false, error: "Supplier name is required." };
  }
  await prisma.supplier.update({ where: { id }, data });
  revalidatePath("/suppliers");
  return { ok: true };
}

export async function deleteSupplier(id: string) {
  await requireUser();
  try {
    await prisma.supplier.delete({ where: { id } });
  } catch {
    await prisma.supplier.update({ where: { id }, data: { status: "INACTIVE" } });
  }
  revalidatePath("/suppliers");
  return { ok: true };
}
