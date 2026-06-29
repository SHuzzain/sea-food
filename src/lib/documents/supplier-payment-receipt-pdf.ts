import type { BusinessProfile, SupplierPaymentReceiptDocument } from "@/lib/documents/types";
import { addPdfHeader } from "@/lib/documents/pdf-header";
import { pdfTableOptions } from "@/lib/documents/pdf-table";
import { drawPdfBalanceFooter, getAutoTableFinalY, pdfMoney } from "@/lib/documents/pdf-utils";

export async function buildSupplierPaymentReceiptPdf(receipt: SupplierPaymentReceiptDocument, profile: BusinessProfile) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF();
  const startY = await addPdfHeader(doc, profile);

  doc.setFontSize(14);
  doc.text("Supplier Payment Receipt", 14, startY);
  doc.setFontSize(10);
  doc.text(`Receipt No: ${receipt.refNo}`, 14, startY + 10);
  doc.text(`Date: ${receipt.paymentDate}`, 14, startY + 16);
  doc.text(`Supplier: ${receipt.supplier.name}`, 14, startY + 22);
  doc.text(`Mobile: ${receipt.supplier.mobile || "-"}`, 14, startY + 28);

  const head = ["Mode", "Amount", "Notes"];
  const body = [[receipt.paymentMode, pdfMoney(receipt.amount), receipt.notes || "-"]];
  autoTable(doc, pdfTableOptions(head, body, startY + 34));

  drawPdfBalanceFooter(doc, getAutoTableFinalY(doc, startY + 42), [
    ["Previous Balance", pdfMoney(receipt.previousBalance)],
    ["Payment Made", pdfMoney(receipt.amount)],
    ["Closing Balance", pdfMoney(receipt.currentBalance)]
  ]);

  return doc.output("blob");
}

export function supplierPaymentReceiptWhatsAppMessage(receipt: SupplierPaymentReceiptDocument, profile: BusinessProfile) {
  return [
    profile.businessName,
    "Supplier Payment Receipt",
    `Date: ${receipt.paymentDate}`,
    `Supplier: ${receipt.supplier.name}`,
    `Amount: ${pdfMoney(receipt.amount).replace("INR ", "₹")}`,
    `Mode: ${receipt.paymentMode}`,
    `Closing Balance: ${pdfMoney(receipt.currentBalance).replace("INR ", "₹")}`
  ].join("\n");
}