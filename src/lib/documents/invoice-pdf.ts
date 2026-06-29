import type { BusinessProfile, SavedSaleDocument } from "@/lib/documents/types";
import { addPdfHeader } from "@/lib/documents/pdf-header";
import { pdfTableOptions } from "@/lib/documents/pdf-table";
import { drawPdfBalanceFooter, getAutoTableFinalY, pdfMoney, pdfPlainKg, pdfPlainRate } from "@/lib/documents/pdf-utils";

export async function buildInvoicePdf(sale: SavedSaleDocument, profile: BusinessProfile) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF();
  const startY = await addPdfHeader(doc, profile);

  doc.setFontSize(10);
  doc.text(`Invoice No: ${sale.invoiceNo}`, 14, startY);
  doc.text(`Invoice Date: ${sale.invoiceDate}`, 14, startY + 6);
  doc.text(`Customer: ${sale.customer.name}`, 14, startY + 16);
  doc.text(`Mobile: ${sale.customer.mobile || "-"}`, 14, startY + 22);

  const head = ["Product", "Kg", "Rate", "Amount"];
  const body = sale.items.map((item) => [
    item.productName,
    pdfPlainKg(item.kg),
    pdfPlainRate(item.rate),
    pdfMoney(item.amount)
  ]);
  autoTable(doc, pdfTableOptions(head, body, startY + 28));

  drawPdfBalanceFooter(doc, getAutoTableFinalY(doc, startY + 36), [
    ["Previous Balance", pdfMoney(sale.previousBalance)],
    ["Total Amount", pdfMoney(sale.totalAmount)],
    ["Received Amount", pdfMoney(sale.receivedAmount)],
    ["Current Balance", pdfMoney(sale.currentBalance)]
  ]);

  return doc.output("blob");
}

export function invoiceWhatsAppMessage(sale: SavedSaleDocument, profile: BusinessProfile) {
  return [
    profile.businessName,
    `Invoice: ${sale.invoiceNo}`,
    `Date: ${sale.invoiceDate}`,
    `Customer: ${sale.customer.name}`,
    `Total: ${pdfMoney(sale.totalAmount).replace("INR ", "₹")}`,
    `Received: ${pdfMoney(sale.receivedAmount).replace("INR ", "₹")}`,
    `Current Balance: ${pdfMoney(sale.currentBalance).replace("INR ", "₹")}`
  ].join("\n");
}