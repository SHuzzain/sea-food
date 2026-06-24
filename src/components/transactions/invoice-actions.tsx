"use client";

import { Download, MessageCircle, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SavedSale } from "@/app/(app)/sale/actions";
import { formatKg, formatRupee } from "@/lib/utils";

function pdfMoney(value: number) {
  return `INR ${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function whatsappPhone(mobile: string) {
  const digits = mobile.replace(/\D/g, "");
  if (!digits) {
    return "";
  }
  return digits.length === 10 ? `91${digits}` : digits;
}

export function InvoiceActions({ sale }: { sale: SavedSale }) {
  async function downloadPdf() {
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text("Seafood Billing", 14, 18);
    doc.setFontSize(10);
    doc.text(`Invoice No: ${sale.invoiceNo}`, 14, 28);
    doc.text(`Invoice Date: ${sale.invoiceDate}`, 14, 34);
    doc.text(`Customer: ${sale.customer.name}`, 14, 44);
    doc.text(`Mobile: ${sale.customer.mobile || "-"}`, 14, 50);

    autoTable(doc, {
      startY: 58,
      head: [["Product", "Kg", "Rate", "Amount"]],
      body: sale.items.map((item) => [
        item.productName,
        item.kg.toString(),
        pdfMoney(item.rate),
        pdfMoney(item.amount)
      ])
    });

    const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 80;
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

    doc.save(`${sale.invoiceNo}.pdf`);
  }

  function shareWhatsApp() {
    const text = [
      "Seafood Billing",
      `Invoice: ${sale.invoiceNo}`,
      `Date: ${sale.invoiceDate}`,
      `Customer: ${sale.customer.name}`,
      `Total: ${formatRupee(sale.totalAmount)}`,
      `Received: ${formatRupee(sale.receivedAmount)}`,
      `Current Balance: ${formatRupee(sale.currentBalance)}`
    ].join("\n");
    const phone = whatsappPhone(sale.customer.mobile);
    const url = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <>
      <div className="grid gap-2 sm:grid-cols-3">
        <Button type="button" variant="outline" size="lg" onClick={() => window.print()}>
          <Printer className="h-5 w-5" />
          Print
        </Button>
        <Button type="button" variant="outline" size="lg" onClick={downloadPdf}>
          <Download className="h-5 w-5" />
          Download PDF
        </Button>
        <Button type="button" variant="secondary" size="lg" onClick={shareWhatsApp}>
          <MessageCircle className="h-5 w-5" />
          WhatsApp
        </Button>
      </div>

      <div className="print-invoice">
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Seafood Billing</h1>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
          <div>
            <p>Customer: {sale.customer.name}</p>
            <p>Mobile: {sale.customer.mobile || "-"}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p>Invoice No: {sale.invoiceNo}</p>
            <p>Invoice Date: {sale.invoiceDate}</p>
          </div>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 16 }}>
          <thead>
            <tr>
              <th style={{ border: "1px solid #111", padding: 6, textAlign: "left" }}>Product</th>
              <th style={{ border: "1px solid #111", padding: 6, textAlign: "right" }}>Kg</th>
              <th style={{ border: "1px solid #111", padding: 6, textAlign: "right" }}>Rate</th>
              <th style={{ border: "1px solid #111", padding: 6, textAlign: "right" }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((item) => (
              <tr key={`${item.productName}-${item.kg}-${item.rate}`}>
                <td style={{ border: "1px solid #111", padding: 6 }}>{item.productName}</td>
                <td style={{ border: "1px solid #111", padding: 6, textAlign: "right" }}>{formatKg(item.kg)}</td>
                <td style={{ border: "1px solid #111", padding: 6, textAlign: "right" }}>{formatRupee(item.rate)}</td>
                <td style={{ border: "1px solid #111", padding: 6, textAlign: "right" }}>{formatRupee(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginLeft: "auto", width: 260 }}>
          <p style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Previous Balance</span>
            <strong>{formatRupee(sale.previousBalance)}</strong>
          </p>
          <p style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Total Amount</span>
            <strong>{formatRupee(sale.totalAmount)}</strong>
          </p>
          <p style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Received Amount</span>
            <strong>{formatRupee(sale.receivedAmount)}</strong>
          </p>
          <p style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Current Balance</span>
            <strong>{formatRupee(sale.currentBalance)}</strong>
          </p>
        </div>
      </div>
    </>
  );
}
