import type { BusinessProfile, SupplierStatementDocument } from "@/lib/documents/types";
import { addPdfHeader } from "@/lib/documents/pdf-header";
import { pdfTableOptions } from "@/lib/documents/pdf-table";
import { drawPdfBalanceFooter, getAutoTableFinalY, pdfMoney } from "@/lib/documents/pdf-utils";

export async function buildSupplierStatementPdf(statement: SupplierStatementDocument, profile: BusinessProfile) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF();
  const startY = await addPdfHeader(doc, profile);

  doc.setFontSize(14);
  doc.text("Supplier Statement", 14, startY);
  doc.setFontSize(10);
  doc.text(`Supplier: ${statement.supplier.name}`, 14, startY + 10);
  doc.text(`Mobile: ${statement.supplier.mobile || "-"}`, 14, startY + 16);
  doc.text(`Period: ${statement.from} to ${statement.to}`, 14, startY + 22);
  doc.text(`Opening Balance: ${pdfMoney(statement.openingBalance)}`, 14, startY + 30);

  const head = ["Date", "Particulars", "Debit", "Credit", "Balance"];
  const body = statement.rows.length
    ? statement.rows.map((row) => [
        row.date,
        row.particulars,
        row.debit ? pdfMoney(row.debit) : "-",
        row.credit ? pdfMoney(row.credit) : "-",
        pdfMoney(row.balance)
      ])
    : [["No transactions", "-", "-", "-", pdfMoney(statement.openingBalance)]];

  autoTable(doc, pdfTableOptions(head, body, startY + 36));

  drawPdfBalanceFooter(doc, getAutoTableFinalY(doc, startY + 44), [
    ["Total Purchases", pdfMoney(statement.totalPurchases)],
    ["Total Payments", pdfMoney(statement.totalPayments)],
    ["Closing Balance", pdfMoney(statement.closingBalance)]
  ]);

  return doc.output("blob");
}

export function supplierStatementWhatsAppMessage(statement: SupplierStatementDocument, profile: BusinessProfile) {
  return [
    profile.businessName,
    "Supplier Statement",
    `Supplier: ${statement.supplier.name}`,
    `Period: ${statement.from} to ${statement.to}`,
    `Total Purchases: ${pdfMoney(statement.totalPurchases).replace("INR ", "₹")}`,
    `Total Payments: ${pdfMoney(statement.totalPayments).replace("INR ", "₹")}`,
    `Closing Balance: ${pdfMoney(statement.closingBalance).replace("INR ", "₹")}`
  ].join("\n");
}