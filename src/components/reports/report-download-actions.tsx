"use client";

import { Download, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ReportDownloadData = {
  label: string;
  from: string;
  to: string;
  summary: {
    purchase: number;
    sales: number;
    collection: number;
    profit: number;
  };
  weeklySellBuy: Array<{
    date: string;
    purchase: number;
    sales: number;
    profit: number;
  }>;
  purchases: Array<{
    date: string;
    supplier: string;
    products: string;
    amount: number;
  }>;
  sales: Array<{
    date: string;
    invoiceNo: string;
    customer: string;
    products: string;
    amount: number;
  }>;
  outstandingCustomers: Array<{
    customer: string;
    mobile: string;
    balance: number;
  }>;
  payments: Array<{
    date: string;
    customer: string;
    mode: string;
    amount: number;
  }>;
  profit: {
    sales: number;
    purchase: number;
    expense: number;
    profit: number;
  };
};

function money(value: number) {
  return Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function csvCell(value: string | number) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, "\"\"")}"` : text;
}

function csvLine(values: Array<string | number>) {
  return values.map(csvCell).join(",");
}

function downloadBlob(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function safeFilename(label: string) {
  return `reports-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "download"}`;
}

export function ReportDownloadActions({ report }: { report: ReportDownloadData }) {
  async function downloadPdf() {
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text("Seafood Billing Reports", 14, 18);
    doc.setFontSize(10);
    doc.text(`Period: ${report.label}`, 14, 26);
    doc.text(`From: ${report.from}  To: ${report.to}`, 14, 32);

    autoTable(doc, {
      startY: 40,
      head: [["Purchase", "Sales", "Collection", "Profit"]],
      body: [[money(report.summary.purchase), money(report.summary.sales), money(report.summary.collection), money(report.summary.profit)]]
    });

    let nextY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 55;
    const sections = [
      ...(report.weeklySellBuy.length
        ? [
            {
              title: "Weekly Sell & Buy Summary",
              head: [["Date", "Purchase / Buy", "Sales / Sell", "Balance"]],
              body: [
                ...report.weeklySellBuy.map((row) => [row.date, money(row.purchase), money(row.sales), money(row.profit)]),
                [
                  "Week Total",
                  money(report.weeklySellBuy.reduce((sum, row) => sum + row.purchase, 0)),
                  money(report.weeklySellBuy.reduce((sum, row) => sum + row.sales, 0)),
                  money(report.weeklySellBuy.reduce((sum, row) => sum + row.profit, 0))
                ]
              ]
            }
          ]
        : []),
      {
        title: "Purchase Report",
        head: [["Date", "Supplier", "Products", "Amount"]],
        body: report.purchases.map((row) => [row.date, row.supplier, row.products, money(row.amount)])
      },
      {
        title: "Sales Report",
        head: [["Date", "Invoice", "Customer", "Products", "Amount"]],
        body: report.sales.map((row) => [row.date, row.invoiceNo, row.customer, row.products, money(row.amount)])
      },
      {
        title: "Customer Outstanding Report",
        head: [["Customer", "Mobile", "Balance"]],
        body: report.outstandingCustomers.map((row) => [row.customer, row.mobile || "-", money(row.balance)])
      },
      {
        title: "Payment Collection Report",
        head: [["Date", "Customer", "Mode", "Amount"]],
        body: report.payments.map((row) => [row.date, row.customer, row.mode, money(row.amount)])
      },
      {
        title: "Profit Report",
        head: [["Sales", "Purchase", "Expense", "Profit"]],
        body: [[money(report.profit.sales), money(report.profit.purchase), money(report.profit.expense), money(report.profit.profit)]]
      }
    ];

    sections.forEach((section) => {
      if (nextY > 250) {
        doc.addPage();
        nextY = 18;
      }
      doc.setFontSize(12);
      doc.text(section.title, 14, nextY + 10);
      autoTable(doc, {
        startY: nextY + 14,
        head: section.head,
        body: section.body.length ? section.body : [["No records"]],
        styles: { fontSize: 8 }
      });
      nextY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? nextY + 24;
    });

    doc.save(`${safeFilename(report.label)}.pdf`);
  }

  function downloadCsv() {
    const lines = [
      csvLine(["Seafood Billing Reports"]),
      csvLine(["Period", report.label]),
      csvLine(["From", report.from, "To", report.to]),
      "",
      csvLine(["Summary"]),
      csvLine(["Purchase", "Sales", "Collection", "Profit"]),
      csvLine([report.summary.purchase, report.summary.sales, report.summary.collection, report.summary.profit]),
      "",
      ...(report.weeklySellBuy.length
        ? [
            csvLine(["Weekly Sell & Buy Summary"]),
            csvLine(["Date", "Purchase / Buy", "Sales / Sell", "Balance"]),
            ...report.weeklySellBuy.map((row) => csvLine([row.date, row.purchase, row.sales, row.profit])),
            csvLine([
              "Week Total",
              report.weeklySellBuy.reduce((sum, row) => sum + row.purchase, 0),
              report.weeklySellBuy.reduce((sum, row) => sum + row.sales, 0),
              report.weeklySellBuy.reduce((sum, row) => sum + row.profit, 0)
            ]),
            ""
          ]
        : []),
      csvLine(["Purchase Report"]),
      csvLine(["Date", "Supplier", "Products", "Amount"]),
      ...report.purchases.map((row) => csvLine([row.date, row.supplier, row.products, row.amount])),
      "",
      csvLine(["Sales Report"]),
      csvLine(["Date", "Invoice", "Customer", "Products", "Amount"]),
      ...report.sales.map((row) => csvLine([row.date, row.invoiceNo, row.customer, row.products, row.amount])),
      "",
      csvLine(["Customer Outstanding Report"]),
      csvLine(["Customer", "Mobile", "Balance"]),
      ...report.outstandingCustomers.map((row) => csvLine([row.customer, row.mobile || "-", row.balance])),
      "",
      csvLine(["Payment Collection Report"]),
      csvLine(["Date", "Customer", "Mode", "Amount"]),
      ...report.payments.map((row) => csvLine([row.date, row.customer, row.mode, row.amount])),
      "",
      csvLine(["Profit Report"]),
      csvLine(["Sales", "Purchase", "Expense", "Profit"]),
      csvLine([report.profit.sales, report.profit.purchase, report.profit.expense, report.profit.profit])
    ];

    downloadBlob(`${safeFilename(report.label)}.csv`, lines.join("\n"), "text/csv;charset=utf-8");
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <Button type="button" variant="outline" size="lg" onClick={downloadPdf}>
        <Download className="h-5 w-5" />
        Download PDF
      </Button>
      <Button type="button" variant="outline" size="lg" onClick={downloadCsv}>
        <FileSpreadsheet className="h-5 w-5" />
        Download CSV
      </Button>
    </div>
  );
}
