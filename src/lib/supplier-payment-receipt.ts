import type { PaymentMode } from "@prisma/client";
import type { SupplierPaymentReceiptDocument } from "@/lib/documents/types";
import { decimalToNumber, formatDisplayDate } from "@/lib/utils";

function signedMoney(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.round(value * 100) / 100;
}

export function toSupplierPaymentReceipt(payment: {
  id: string;
  paymentDate: Date | string;
  amount: { toString(): string };
  paymentMode: PaymentMode;
  notes: string | null;
  supplier: { name: string; mobile: string | null };
  ledgerEntries?: Array<{ balance: { toString(): string } }>;
}): SupplierPaymentReceiptDocument {
  const amount = decimalToNumber(payment.amount);
  const currentBalance = payment.ledgerEntries?.[0]
    ? decimalToNumber(payment.ledgerEntries[0].balance)
    : 0;

  return {
    refNo: payment.id.slice(-8).toUpperCase(),
    paymentDate: formatDisplayDate(payment.paymentDate),
    supplier: {
      name: payment.supplier.name,
      mobile: payment.supplier.mobile ?? ""
    },
    amount,
    paymentMode: payment.paymentMode,
    notes: payment.notes ?? "",
    previousBalance: signedMoney(currentBalance + amount),
    currentBalance
  };
}