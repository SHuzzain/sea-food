import type { PaymentMode } from "@prisma/client";
import type { PaymentReceiptDocument } from "@/lib/documents/types";
import { decimalToNumber } from "@/lib/utils";

function signedMoney(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.round(value * 100) / 100;
}

export function toPaymentReceipt(payment: {
  id: string;
  paymentDate: Date;
  amount: { toString(): string };
  paymentMode: PaymentMode;
  notes: string | null;
  customer: { name: string; mobile: string | null };
  ledgerEntries?: Array<{ balance: { toString(): string } }>;
}): PaymentReceiptDocument {
  const amount = decimalToNumber(payment.amount);
  const currentBalance = payment.ledgerEntries?.[0]
    ? decimalToNumber(payment.ledgerEntries[0].balance)
    : 0;

  return {
    refNo: payment.id.slice(-8).toUpperCase(),
    paymentDate: payment.paymentDate.toLocaleDateString("en-IN"),
    customer: {
      name: payment.customer.name,
      mobile: payment.customer.mobile ?? ""
    },
    amount,
    paymentMode: payment.paymentMode,
    notes: payment.notes ?? "",
    previousBalance: signedMoney(currentBalance + amount),
    currentBalance
  };
}
