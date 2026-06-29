"use server";

import { PaymentMode } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { invalidateSupplierPaymentsCache, invalidateSuppliersCache } from "@/lib/cache/invalidate";
import { requireUser } from "@/lib/auth";
import type { SupplierPaymentReceiptDocument } from "@/lib/documents/types";
import { prisma } from "@/lib/prisma";
import { recalculateSupplierLedger } from "@/lib/supplier-ledger";
import { decimalToNumber, parseDateInput, toMoney } from "@/lib/utils";

export type SupplierPaymentPayload = {
  supplierId: string;
  paymentDate: string;
  amount: number;
  paymentMode: PaymentMode;
  notes?: string;
};

function signedMoney(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.round(value * 100) / 100;
}

function validMode(mode: PaymentMode) {
  return Object.values(PaymentMode).includes(mode);
}

export async function createSupplierPayment(payload: SupplierPaymentPayload) {
  await requireUser();
  const amount = toMoney(payload.amount);
  const paymentDate = payload.paymentDate ? parseDateInput(payload.paymentDate) : new Date();
  const mode = validMode(payload.paymentMode) ? payload.paymentMode : PaymentMode.CASH;

  if (!payload.supplierId) {
    return { ok: false, error: "Select a supplier." };
  }
  if (amount <= 0) {
    return { ok: false, error: "Enter a payment amount." };
  }

  const supplier = await prisma.supplier.findUnique({ where: { id: payload.supplierId } });
  if (!supplier) {
    return { ok: false, error: "Supplier not found." };
  }

  const previousBalance = decimalToNumber(supplier.outstandingBalance);
  const currentBalance = signedMoney(previousBalance - amount);

  const payment = await prisma.$transaction(async (tx) => {
    const createdPayment = await tx.supplierPayment.create({
      data: {
        supplierId: supplier.id,
        paymentDate,
        amount,
        paymentMode: mode,
        notes: payload.notes?.trim() || ""
      }
    });

    await tx.supplier.update({
      where: { id: supplier.id },
      data: { outstandingBalance: currentBalance }
    });

    await tx.supplierLedgerEntry.create({
      data: {
        supplierId: supplier.id,
        supplierPaymentId: createdPayment.id,
        entryDate: paymentDate,
        type: "PAYMENT",
        refNo: createdPayment.id.slice(-8).toUpperCase(),
        description: `Payment - ${mode}`,
        debit: 0,
        credit: amount,
        balance: currentBalance
      }
    });

    return createdPayment;
  });

  const receipt: SupplierPaymentReceiptDocument = {
    refNo: payment.id.slice(-8).toUpperCase(),
    paymentDate: paymentDate.toLocaleDateString("en-IN"),
    supplier: {
      name: supplier.name,
      mobile: supplier.mobile ?? ""
    },
    amount,
    paymentMode: mode,
    notes: payload.notes?.trim() || "",
    previousBalance,
    currentBalance
  };

  invalidateSupplierPaymentsCache();
  invalidateSuppliersCache();
  revalidatePath("/");
  revalidatePath("/payment");
  revalidatePath("/payment/new");
  revalidatePath("/suppliers");
  revalidatePath("/purchase");
  revalidatePath("/reports");
  return { ok: true, paymentId: payment.id, currentBalance, receipt };
}

export async function updateSupplierPayment(id: string, payload: SupplierPaymentPayload) {
  await requireUser();
  const amount = toMoney(payload.amount);
  const paymentDate = payload.paymentDate ? parseDateInput(payload.paymentDate) : new Date();
  const mode = validMode(payload.paymentMode) ? payload.paymentMode : PaymentMode.CASH;

  if (!payload.supplierId) {
    return { ok: false, error: "Select a supplier." };
  }
  if (amount <= 0) {
    return { ok: false, error: "Enter a payment amount." };
  }

  const existing = await prisma.supplierPayment.findUnique({
    where: { id },
    select: { id: true, supplierId: true }
  });
  if (!existing) {
    return { ok: false, error: "Payment not found." };
  }

  const supplier = await prisma.supplier.findUnique({ where: { id: payload.supplierId } });
  if (!supplier) {
    return { ok: false, error: "Supplier not found." };
  }

  const previousSupplierId = existing.supplierId;

  await prisma.$transaction(async (tx) => {
    await tx.supplierPayment.update({
      where: { id },
      data: {
        supplierId: payload.supplierId,
        paymentDate,
        amount,
        paymentMode: mode,
        notes: payload.notes?.trim() || ""
      }
    });

    await tx.supplierLedgerEntry.updateMany({
      where: { supplierPaymentId: id },
      data: {
        supplierId: payload.supplierId,
        entryDate: paymentDate,
        credit: amount,
        debit: 0,
        description: `Payment - ${mode}`
      }
    });

    await recalculateSupplierLedger(payload.supplierId, tx);
    if (previousSupplierId !== payload.supplierId) {
      await recalculateSupplierLedger(previousSupplierId, tx);
    }
  });

  invalidateSupplierPaymentsCache();
  invalidateSuppliersCache();
  revalidatePath("/");
  revalidatePath("/payment");
  revalidatePath("/payment/new");
  revalidatePath("/suppliers");
  revalidatePath("/purchase");
  revalidatePath("/reports");
  return { ok: true };
}

export async function deleteSupplierPayment(id: string) {
  await requireUser();
  const existing = await prisma.supplierPayment.findUnique({
    where: { id },
    select: { id: true, supplierId: true }
  });
  if (!existing) {
    return { ok: false, error: "Payment not found." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.supplierLedgerEntry.deleteMany({ where: { supplierPaymentId: id } });
    await tx.supplierPayment.delete({ where: { id } });
    await recalculateSupplierLedger(existing.supplierId, tx);
  });

  invalidateSupplierPaymentsCache();
  invalidateSuppliersCache();
  revalidatePath("/");
  revalidatePath("/payment");
  revalidatePath("/payment/new");
  revalidatePath("/suppliers");
  revalidatePath("/purchase");
  revalidatePath("/reports");
  return { ok: true };
}