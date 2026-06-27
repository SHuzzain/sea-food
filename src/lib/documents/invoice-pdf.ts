import type { BusinessProfile, SavedSaleDocument } from "@/lib/documents/types";
import { addPdfHeader } from "@/lib/documents/pdf-header";
import { getAutoTableFinalY, pdfMoney } from "@/lib/documents/pdf-utils";

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

  autoTable(doc, {
    startY: startY + 28,
    head: [["Product", "Kg", "Rate", "Amount"]],
    body: sale.items.map((item) => [item.productName, item.kg.toString(), pdfMoney(item.rate), pdfMoney(item.amount)])
  });

  const finalY = getAutoTableFinalY(doc, startY + 36);
  const rows = [
    ["Previous Balance", pdfMoney(sale.previousBalance)],
    ["Total Amount", pdfMoney(sale.totalAmount)],
    ["Received Amount", pdfMoney(sale.receivedAmount)],
    ["Current Balance", pdfMoney(sale.currentBalance)]
  ];
  rows.forEach((row, index) => {
    const y = finalY + 12 + index * 7;
    doc.text(row[0], 120, y);
    doc.text(row[1], 190, y, { align: "right" });
  });

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
