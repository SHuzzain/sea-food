"use server";

import { revalidatePath } from "next/cache";
import { invalidateSuppliersCache } from "@/lib/cache/invalidate";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decimalToNumber, toMoney } from "@/lib/utils";

export type SupplierPayload = {
  name: string;
  mobile?: string;
  address?: string;
  openingBalance?: number;
  outstandingBalance?: number;
  status?: "ACTIVE" | "INACTIVE";
};

function cleanSupplier(payload: SupplierPayload) {
  const openingBalance = toMoney(payload.openingBalance);
  const outstandingBalance =
    payload.outstandingBalance === undefined || payload.outstandingBalance === null
      ? openingBalance
      : toMoney(payload.outstandingBalance);

  return {
    name: payload.name.trim(),
    mobile: payload.mobile?.trim() || "",
    address: payload.address?.trim() || "",
    openingBalance,
    outstandingBalance,
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
    data: {
      ...data,
      ledgerEntries:
        data.openingBalance > 0
          ? {
              create: {
                entryDate: new Date(),
                type: "OPENING",
                description: "Opening balance",
                debit: data.openingBalance,
                credit: 0,
                balance: data.openingBalance
              }
            }
          : undefined
    },
    select: { id: true, name: true, mobile: true, outstandingBalance: true }
  });

  invalidateSuppliersCache();
  revalidatePath("/suppliers");
  revalidatePath("/purchase");
  revalidatePath("/payment");
  revalidatePath("/reports");
  return {
    ok: true,
    supplier: {
      id: supplier.id,
      label: supplier.name,
      meta: supplier.mobile ?? "",
      balance: decimalToNumber(supplier.outstandingBalance)
    }
  };
}

export async function updateSupplier(id: string, payload: SupplierPayload) {
  await requireUser();
  const data = cleanSupplier(payload);
  if (!data.name) {
    return { ok: false, error: "Supplier name is required." };
  }

  const existing = await prisma.supplier.findUnique({ where: { id } });
  if (!existing) {
    return { ok: false, error: "Supplier not found." };
  }

  const openingDelta = data.openingBalance - decimalToNumber(existing.openingBalance);
  await prisma.supplier.update({
    where: { id },
    data: {
      ...data,
      outstandingBalance:
        payload.outstandingBalance === undefined || payload.outstandingBalance === null
          ? decimalToNumber(existing.outstandingBalance) + openingDelta
          : data.outstandingBalance
    }
  });

  invalidateSuppliersCache();
  revalidatePath("/suppliers");
  revalidatePath("/purchase");
  revalidatePath("/payment");
  revalidatePath("/reports");
  return { ok: true };
}

export async function deleteSupplier(id: string) {
  await requireUser();
  try {
    await prisma.supplier.delete({ where: { id } });
  } catch {
    await prisma.supplier.update({ where: { id }, data: { status: "INACTIVE" } });
  }
  invalidateSuppliersCache();
  revalidatePath("/suppliers");
  return { ok: true };
}