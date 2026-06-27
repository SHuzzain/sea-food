"use client";

import { Download, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BusinessProfile } from "@/lib/documents/types";
import { DEFAULT_BUSINESS_PROFILE } from "@/lib/documents/types";
import { addPdfHeader } from "@/lib/documents/pdf-header";

export type ReportDownloadData = {
  label: string;
  from: string;
  to: string;
  customerName?: string;
  customerFiltered: boolean;
  business: BusinessProfile;
  summary: {
    purchase: number;
    sales: number;
    collection: number;
    outstanding: number;
  };
  weeklySellBuy: Array<{
    date: string;
    purchase: number;
    sales: number;
    balance: number;
  }>;
  statement?: {
    openingBalance: number;
    closingBalance: number;
    totalSales: number;
    totalPayments: number;
    rows: Array<{
      date: string;
      particulars: string;
      debit: number;
      credit: number;
      balance: number;
    }>;
  };
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

function csvBusinessHeader(business: BusinessProfile) {
  return [
    csvLine([business.businessName]),
    ...(business.businessTagline ? [csvLine(["Tagline", business.businessTagline])] : []),
    ...(business.businessAddress ? [csvLine(["Address", business.businessAddress])] : []),
    ...(business.businessMobile ? [csvLine(["Mobile", business.businessMobile])] : []),
    ""
  ];
}

export function ReportDownloadActions({
  report,
  profile = report.business ?? DEFAULT_BUSINESS_PROFILE
}: {
  report: ReportDownloadData;
  profile?: BusinessProfile;
}) {
  async function downloadPdf() {
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF();

    const headerEndY = await addPdfHeader(doc, profile);
    doc.setFontSize(14);
    doc.text("Reports", 14, headerEndY);
    doc.setFontSize(10);
    let metaY = headerEndY + 8;
    doc.text(`Period: ${report.label}`, 14, metaY);
    metaY += 6;
    doc.text(`From: ${report.from}  To: ${report.to}`, 14, metaY);
    metaY += 6;
    if (report.customerName) {
      doc.text(`Customer: ${report.customerName}`, 14, metaY);
      metaY += 6;
    }

    const summaryHead = report.customerFiltered
      ? [["Sales", "Collection", "Outstanding"]]
      : [["Purchase", "Sales", "Collection", "Outstanding"]];
    const summaryBody = report.customerFiltered
      ? [[money(report.summary.sales), money(report.summary.collection), money(report.summary.outstanding)]]
      : [
          [
            money(report.summary.purchase),
            money(report.summary.sales),
            money(report.summary.collection),
            money(report.summary.outstanding)
          ]
        ];

    autoTable(doc, {
      startY: metaY + 4,
      head: summaryHead,
      body: summaryBody
    });

    let nextY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 55;
    const sections = [
      ...(report.statement
        ? [
            {
              title: "Customer Statement",
              head: [["Date", "Particulars", "Debit", "Credit", "Balance"]],
              body: [
                ["Opening", "Opening Balance", money(report.statement.openingBalance), "-", money(report.statement.openingBalance)],
                ...report.statement.rows.map((row) => [
                  row.date,
                  row.particulars,
                  row.debit ? money(row.debit) : "-",
                  row.credit ? money(row.credit) : "-",
                  money(row.balance)
                ]),
                [
                  "Closing",
                  "Closing Balance",
                  money(report.statement.totalSales),
                  money(report.statement.totalPayments),
                  money(report.statement.closingBalance)
                ]
              ]
            }
          ]
        : []),
      ...(report.weeklySellBuy.length && !report.customerFiltered
        ? [
            {
              title: "Weekly Sell & Buy Summary",
              head: [["Date", "Purchase / Buy", "Sales / Sell", "Balance"]],
              body: [
                ...report.weeklySellBuy.map((row) => [row.date, money(row.purchase), money(row.sales), money(row.balance)]),
                [
                  "Week Total",
                  money(report.weeklySellBuy.reduce((sum, row) => sum + row.purchase, 0)),
                  money(report.weeklySellBuy.reduce((sum, row) => sum + row.sales, 0)),
                  money(report.weeklySellBuy.reduce((sum, row) => sum + row.balance, 0))
                ]
              ]
            }
          ]
        : []),
      ...(!report.customerFiltered
        ? [
            {
              title: "Purchase Report",
              head: [["Date", "Supplier", "Products", "Amount"]],
              body: report.purchases.map((row) => [row.date, row.supplier, row.products, money(row.amount)])
            }
          ]
        : []),
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
      ...csvBusinessHeader(profile),
      csvLine(["Reports"]),
      csvLine(["Period", report.label]),
      csvLine(["From", report.from, "To", report.to]),
      ...(report.customerName ? [csvLine(["Customer", report.customerName]), ""] : [""]),
      csvLine(["Summary"]),
      ...(report.customerFiltered
        ? [
            csvLine(["Sales", "Collection", "Outstanding"]),
            csvLine([report.summary.sales, report.summary.collection, report.summary.outstanding]),
            ""
          ]
        : [
            csvLine(["Purchase", "Sales", "Collection", "Outstanding"]),
            csvLine([report.summary.purchase, report.summary.sales, report.summary.collection, report.summary.outstanding]),
            ""
          ]),
      ...(report.statement
        ? [
            csvLine(["Customer Statement"]),
            csvLine(["Opening Balance", report.statement.openingBalance]),
            csvLine(["Date", "Particulars", "Debit", "Credit", "Balance"]),
            ...report.statement.rows.map((row) => csvLine([row.date, row.particulars, row.debit, row.credit, row.balance])),
            csvLine(["Closing Balance", report.statement.closingBalance]),
            ""
          ]
        : []),
      ...(report.weeklySellBuy.length && !report.customerFiltered
        ? [
            csvLine(["Weekly Sell & Buy Summary"]),
            csvLine(["Date", "Purchase / Buy", "Sales / Sell", "Balance"]),
            ...report.weeklySellBuy.map((row) => csvLine([row.date, row.purchase, row.sales, row.balance])),
            csvLine([
              "Week Total",
              report.weeklySellBuy.reduce((sum, row) => sum + row.purchase, 0),
              report.weeklySellBuy.reduce((sum, row) => sum + row.sales, 0),
              report.weeklySellBuy.reduce((sum, row) => sum + row.balance, 0)
            ]),
            ""
          ]
        : []),
      ...(!report.customerFiltered
        ? [
            csvLine(["Purchase Report"]),
            csvLine(["Date", "Supplier", "Products", "Amount"]),
            ...report.purchases.map((row) => csvLine([row.date, row.supplier, row.products, row.amount])),
            ""
          ]
        : []),
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
      ...report.payments.map((row) => csvLine([row.date, row.customer, row.mode, row.amount]))
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
