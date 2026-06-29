import type { BusinessProfile, PurchaseDocument } from "@/lib/documents/types";
import { addPdfHeader } from "@/lib/documents/pdf-header";
import { getAutoTableFinalY, pdfMoney } from "@/lib/documents/pdf-utils";

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

  autoTable(doc, {
    startY: startY + 38,
    head: [["Product", "Kg", "Rate", "Amount"]],
    body: purchase.items.map((item) => [item.productName, item.kg.toString(), pdfMoney(item.rate), pdfMoney(item.amount)])
  });

  const finalY = getAutoTableFinalY(doc, startY + 46);
  doc.text("Total Amount", 120, finalY + 12);
  doc.text(pdfMoney(purchase.totalAmount), 190, finalY + 12, { align: "right" });

  return doc.output("blob");
}

export function purchaseWhatsAppMessage(purchase: PurchaseDocument, profile: BusinessProfile) {
  return [
    profile.businessName,
    "Purchase Bill",
    `Ref: ${purchase.refNo}`,
    `Date: ${purchase.purchaseDate}`,
    `Supplier: ${purchase.supplier.name}`,
    `Total: ${pdfMoney(purchase.totalAmount).replace("INR ", "₹")}`
  ].join("\n");
}