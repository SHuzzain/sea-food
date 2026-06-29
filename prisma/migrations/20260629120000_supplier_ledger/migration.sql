-- CreateEnum
CREATE TYPE "SupplierLedgerType" AS ENUM ('OPENING', 'PURCHASE', 'PAYMENT', 'ADJUSTMENT');

-- AlterTable
ALTER TABLE "Supplier" ADD COLUMN "openingBalance" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "Supplier" ADD COLUMN "outstandingBalance" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Purchase" ADD COLUMN "previousBalance" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "Purchase" ADD COLUMN "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "Purchase" ADD COLUMN "currentBalance" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- Backfill existing purchases as fully paid so supplier outstanding stays unchanged
UPDATE "Purchase" SET "paidAmount" = "totalAmount", "currentBalance" = 0;

-- CreateTable
CREATE TABLE "SupplierPayment" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paymentMode" "PaymentMode" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierLedgerEntry" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "entryDate" TIMESTAMP(3) NOT NULL,
    "type" "SupplierLedgerType" NOT NULL,
    "refNo" TEXT,
    "description" TEXT,
    "debit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "credit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "balance" DECIMAL(12,2) NOT NULL,
    "purchaseId" TEXT,
    "supplierPaymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupplierPayment_paymentDate_idx" ON "SupplierPayment"("paymentDate");
CREATE INDEX "SupplierPayment_supplierId_idx" ON "SupplierPayment"("supplierId");
CREATE INDEX "SupplierLedgerEntry_entryDate_idx" ON "SupplierLedgerEntry"("entryDate");
CREATE INDEX "SupplierLedgerEntry_supplierId_idx" ON "SupplierLedgerEntry"("supplierId");
CREATE INDEX "SupplierLedgerEntry_type_idx" ON "SupplierLedgerEntry"("type");

-- AddForeignKey
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupplierLedgerEntry" ADD CONSTRAINT "SupplierLedgerEntry_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupplierLedgerEntry" ADD CONSTRAINT "SupplierLedgerEntry_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupplierLedgerEntry" ADD CONSTRAINT "SupplierLedgerEntry_supplierPaymentId_fkey" FOREIGN KEY ("supplierPaymentId") REFERENCES "SupplierPayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;