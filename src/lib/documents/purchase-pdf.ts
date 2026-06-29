import type { BusinessProfile, PurchaseDocument } from "@/lib/documents/types";
import { addPdfHeader } from "@/lib/documents/pdf-header";
import { pdfTableOptions } from "@/lib/documents/pdf-table";
import { drawPdfBalanceFooter, getAutoTableFinalY, pdfMoney, pdfPlainKg, pdfPlainRate } from "@/lib/documents/pdf-utils";

export async function buildPurchasePdf(purchase: PurchaseDocument, profile: BusinessProfile) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF();
  const startY = await addPdfHeader(doc, profile);

  doc.setFontSize(14);
  doc.text("Purchase Bill", 14, startY);
  doc.setFontSize(10);
  doc.text(`Ref No: ${purchase.refNo}`, 14, startY + 10);
  doc.text(`Date: ${purchase.purchaseDate}`, 14, startY + 16);
  doc.text(`Supplier: ${purchase.supplier.name}`, 14, startY + 26);
  doc.text(`Mobile: ${purchase.supplier.mobile || "-"}`, 14, startY + 32);

  const head = ["Product", "Kg", "Rate", "Amount"];
  const body = purchase.items.map((item) => [
    item.productName,
    pdfPlainKg(item.kg),
    pdfPlainRate(item.rate),
    pdfMoney(item.amount)
  ]);
  autoTable(doc, pdfTableOptions(head, body, startY + 38));

  drawPdfBalanceFooter(doc, getAutoTableFinalY(doc, startY + 46), [
    ["Previous Balance", pdfMoney(purchase.previousBalance)],
    ["Total Amount", pdfMoney(purchase.totalAmount)],
    ["Paid Amount", pdfMoney(purchase.paidAmount)],
    ["Current Balance", pdfMoney(purchase.currentBalance)]
  ]);

  return doc.output("blob");
}

export function purchaseWhatsAppMessage(purchase: PurchaseDocument, profile: BusinessProfile) {
  return [
    profile.businessName,
    "Purchase Bill",
    `Ref: ${purchase.refNo}`,
    `Date: ${purchase.purchaseDate}`,
    `Supplier: ${purchase.supplier.name}`,
    `Total: ${pdfMoney(purchase.totalAmount).replace("INR ", "₹")}`,
    `Paid: ${pdfMoney(purchase.paidAmount).replace("INR ", "₹")}`,
    `Current Balance: ${pdfMoney(purchase.currentBalance).replace("INR ", "₹")}`
  ].join("\n");
}