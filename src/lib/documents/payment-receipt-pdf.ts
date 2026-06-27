import type { BusinessProfile, PaymentReceiptDocument } from "@/lib/documents/types";
import { addPdfHeader } from "@/lib/documents/pdf-header";
import { getAutoTableFinalY, pdfMoney } from "@/lib/documents/pdf-utils";

export async function buildPaymentReceiptPdf(receipt: PaymentReceiptDocument, profile: BusinessProfile) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF();
  const startY = await addPdfHeader(doc, profile);

  doc.setFontSize(14);
  doc.text("Payment Receipt", 14, startY);
  doc.setFontSize(10);
  doc.text(`Receipt No: ${receipt.refNo}`, 14, startY + 10);
  doc.text(`Date: ${receipt.paymentDate}`, 14, startY + 16);
  doc.text(`Customer: ${receipt.customer.name}`, 14, startY + 26);
  doc.text(`Mobile: ${receipt.customer.mobile || "-"}`, 14, startY + 32);

  autoTable(doc, {
    startY: startY + 38,
    head: [["Mode", "Amount", "Notes"]],
    body: [[receipt.paymentMode, pdfMoney(receipt.amount), receipt.notes || "-"]]
  });

  const finalY = getAutoTableFinalY(doc, startY + 46);
  const rows = [
    ["Previous Balance", pdfMoney(receipt.previousBalance)],
    ["Payment Received", pdfMoney(receipt.amount)],
    ["Current Balance", pdfMoney(receipt.currentBalance)]
  ];
  rows.forEach((row, index) => {
    const y = finalY + 12 + index * 7;
    doc.text(row[0], 120, y);
    doc.text(row[1], 190, y, { align: "right" });
  });

  return doc.output("blob");
}

export function paymentReceiptWhatsAppMessage(receipt: PaymentReceiptDocument, profile: BusinessProfile) {
  return [
    profile.businessName,
    "Payment Receipt",
    `Date: ${receipt.paymentDate}`,
    `Customer: ${receipt.customer.name}`,
    `Amount: ${pdfMoney(receipt.amount).replace("INR ", "₹")}`,
    `Mode: ${receipt.paymentMode}`,
    `Current Balance: ${pdfMoney(receipt.currentBalance).replace("INR ", "₹")}`
  ].join("\n");
}
