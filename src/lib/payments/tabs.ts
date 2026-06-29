export const PAYMENT_TABS = [
  { id: "customer", label: "Customer" },
  { id: "supplier", label: "Supplier" }
] as const;

export type PaymentTab = (typeof PAYMENT_TABS)[number]["id"];

export const DEFAULT_PAYMENT_TAB: PaymentTab = "customer";

export function isPaymentTab(value?: string): value is PaymentTab {
  return value === "customer" || value === "supplier";
}