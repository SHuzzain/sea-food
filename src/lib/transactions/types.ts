import type { PaymentMode } from "@prisma/client";

export type EditablePurchaseItem = {
  productId: string;
  kg: number;
  rate: number;
};

export type EditablePurchase = {
  id: string;
  purchaseDate: string;
  supplierId: string;
  items: EditablePurchaseItem[];
};

export type EditableSaleItem = {
  productId: string;
  kg: number;
  rate: number;
};

export type EditableSale = {
  id: string;
  invoiceNo: string;
  invoiceDate: string;
  customerId: string;
  receivedAmount: number;
  items: EditableSaleItem[];
};

export type EditablePayment = {
  id: string;
  customerId: string;
  paymentDate: string;
  amount: number;
  paymentMode: PaymentMode;
  notes: string;
};