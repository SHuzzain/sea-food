"use server";

import { PaymentMode } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import type { PaymentReceiptDocument } from "@/lib/documents/types";
import { prisma } from "@/lib/prisma";
import { decimalToNumber, parseDateInput, toMoney } from "@/lib/utils";

export type PaymentPayload = {
  customerId: string;
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

export async function createPayment(payload: PaymentPayload) {
  await requireUser();
  const amount = toMoney(payload.amount);
  const paymentDate = payload.paymentDate ? parseDateInput(payload.paymentDate) : new Date();
  const mode = validMode(payload.paymentMode) ? payload.paymentMode : PaymentMode.CASH;

  if (!payload.customerId) {
    return { ok: false, error: "Select a customer." };
  }
  if (amount <= 0) {
    return { ok: false, error: "Enter a payment amount." };
  }

  const customer = await prisma.customer.findUnique({ where: { id: payload.customerId } });
  if (!customer) {
    return { ok: false, error: "Customer not found." };
  }

  const previousBalance = decimalToNumber(customer.outstandingBalance);
  const currentBalance = signedMoney(previousBalance - amount);

  const payment = await prisma.$transaction(async (tx) => {
    const createdPayment = await tx.payment.create({
      data: {
        customerId: customer.id,
        paymentDate,
        amount,
        paymentMode: mode,
        notes: payload.notes?.trim() || ""
      }
    });

    await tx.customer.update({
      where: { id: customer.id },
      data: { outstandingBalance: currentBalance }
    });

    await tx.ledgerEntry.create({
      data: {
        customerId: customer.id,
        paymentId: createdPayment.id,
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

  const receipt: PaymentReceiptDocument = {
    refNo: payment.id.slice(-8).toUpperCase(),
    paymentDate: paymentDate.toLocaleDateString("en-IN"),
    customer: {
      name: customer.name,
      mobile: customer.mobile ?? ""
    },
    amount,
    paymentMode: mode,
    notes: payload.notes?.trim() || "",
    previousBalance,
    currentBalance
  };

  revalidatePath("/");
  revalidatePath("/payment");
  revalidatePath("/customers");
  revalidatePath("/reports");
  return { ok: true, paymentId: payment.id, currentBalance, receipt };
}
