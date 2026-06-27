import type { BusinessProfile, CustomerStatementDocument } from "@/lib/documents/types";
import { addPdfHeader } from "@/lib/documents/pdf-header";
import { getAutoTableFinalY, pdfMoney } from "@/lib/documents/pdf-utils";

export async function buildCustomerStatementPdf(statement: CustomerStatementDocument, profile: BusinessProfile) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF();
  const startY = await addPdfHeader(doc, profile);

  doc.setFontSize(14);
  doc.text("Customer Statement", 14, startY);
  doc.setFontSize(10);
  doc.text(`Customer: ${statement.customer.name}`, 14, startY + 10);
  doc.text(`Mobile: ${statement.customer.mobile || "-"}`, 14, startY + 16);
  doc.text(`Period: ${statement.from} to ${statement.to}`, 14, startY + 22);
  doc.text(`Opening Balance: ${pdfMoney(statement.openingBalance)}`, 14, startY + 30);

  autoTable(doc, {
    startY: startY + 36,
    head: [["Date", "Particulars", "Debit", "Credit", "Balance"]],
    body: statement.rows.length
      ? statement.rows.map((row) => [
          row.date,
          row.particulars,
          row.debit ? pdfMoney(row.debit) : "-",
          row.credit ? pdfMoney(row.credit) : "-",
          pdfMoney(row.balance)
        ])
      : [["No transactions", "-", "-", "-", pdfMoney(statement.openingBalance)]],
    styles: { fontSize: 8 }
  });

  const finalY = getAutoTableFinalY(doc, startY + 44);
  const totals = [
    ["Total Sales", pdfMoney(statement.totalSales)],
    ["Total Payments", pdfMoney(statement.totalPayments)],
    ["Closing Balance", pdfMoney(statement.closingBalance)]
  ];
  totals.forEach((row, index) => {
    const y = finalY + 12 + index * 7;
    doc.text(row[0], 120, y);
    doc.text(row[1], 190, y, { align: "right" });
  });

  return doc.output("blob");
}

export function customerStatementWhatsAppMessage(statement: CustomerStatementDocument, profile: BusinessProfile) {
  return [
    profile.businessName,
    "Customer Statement",
    `Customer: ${statement.customer.name}`,
    `Period: ${statement.from} to ${statement.to}`,
    `Total Sales: ${pdfMoney(statement.totalSales).replace("INR ", "₹")}`,
    `Total Payments: ${pdfMoney(statement.totalPayments).replace("INR ", "₹")}`,
    `Closing Balance: ${pdfMoney(statement.closingBalance).replace("INR ", "₹")}`
  ].join("\n");
}
