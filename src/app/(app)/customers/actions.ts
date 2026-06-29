"use server";

import { revalidatePath } from "next/cache";
import { invalidateCustomersCache } from "@/lib/cache/invalidate";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decimalToNumber, toMoney } from "@/lib/utils";

export type CustomerPayload = {
  name: string;
  mobile?: string;
  address?: string;
  openingBalance?: number;
  outstandingBalance?: number;
  status?: "ACTIVE" | "INACTIVE";
};

function cleanCustomer(payload: CustomerPayload) {
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

export async function createCustomer(payload: CustomerPayload) {
  await requireUser();
  const data = cleanCustomer(payload);
  if (!data.name) {
    return { ok: false, error: "Customer name is required." };
  }

  const customer = await prisma.customer.create({
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

  invalidateCustomersCache();
  revalidatePath("/customers");
  return {
    ok: true,
    customer: {
      id: customer.id,
      label: customer.name,
      meta: customer.mobile ?? "",
      balance: decimalToNumber(customer.outstandingBalance)
    }
  };
}

export async function updateCustomer(id: string, payload: CustomerPayload) {
  await requireUser();
  const data = cleanCustomer(payload);
  if (!data.name) {
    return { ok: false, error: "Customer name is required." };
  }

  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) {
    return { ok: false, error: "Customer not found." };
  }

  const openingDelta = data.openingBalance - decimalToNumber(existing.openingBalance);
  await prisma.customer.update({
    where: { id },
    data: {
      ...data,
      outstandingBalance:
        payload.outstandingBalance === undefined || payload.outstandingBalance === null
          ? decimalToNumber(existing.outstandingBalance) + openingDelta
          : data.outstandingBalance
    }
  });

  invalidateCustomersCache();
  revalidatePath("/customers");
  return { ok: true };
}

export async function deleteCustomer(id: string) {
  await requireUser();
  try {
    await prisma.customer.delete({ where: { id } });
  } catch {
    await prisma.customer.update({ where: { id }, data: { status: "INACTIVE" } });
  }
  invalidateCustomersCache();
  revalidatePath("/customers");
  return { ok: true };
}
