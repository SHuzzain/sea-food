export type BusinessProfile = {
  businessName: string;
  businessTagline: string;
  businessAddress: string;
  businessMobile: string;
};

export const DEFAULT_BUSINESS_PROFILE: BusinessProfile = {
  businessName: "ARF Seafoods",
  businessTagline: "Fresh from nature, delivered with care",
  businessAddress: "Ramanathapuram",
  businessMobile: ""
};

export type SavedSaleDocument = {
  invoiceNo: string;
  invoiceDate: string;
  customer: {
    name: string;
    mobile: string;
  };
  items: {
    productName: string;
    kg: number;
    rate: number;
    amount: number;
  }[];
  previousBalance: number;
  totalAmount: number;
  receivedAmount: number;
  currentBalance: number;
};

export type PaymentReceiptDocument = {
  refNo: string;
  paymentDate: string;
  customer: {
    name: string;
    mobile: string;
  };
  amount: number;
  paymentMode: string;
  notes: string;
  previousBalance: number;
  currentBalance: number;
};

export type CustomerStatementRow = {
  date: string;
  particulars: string;
  debit: number;
  credit: number;
  balance: number;
};

export type PurchaseDocument = {
  refNo: string;
  purchaseDate: string;
  supplier: {
    name: string;
    mobile: string;
  };
  items: {
    productName: string;
    kg: number;
    rate: number;
    amount: number;
  }[];
  totalAmount: number;
};

export type CustomerStatementDocument = {
  customer: {
    name: string;
    mobile: string;
  };
  periodLabel: string;
  from: string;
  to: string;
  openingBalance: number;
  closingBalance: number;
  totalSales: number;
  totalPayments: number;
  rows: CustomerStatementRow[];
};
