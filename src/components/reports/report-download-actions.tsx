"use client";

import { Download, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BusinessProfile } from "@/lib/documents/types";
import { DEFAULT_BUSINESS_PROFILE } from "@/lib/documents/types";
import { addPdfHeader } from "@/lib/documents/pdf-header";
import { downloadBlob } from "@/lib/documents/pdf-utils";
import { sharePdfWithWhatsApp } from "@/lib/documents/whatsapp";

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

function safeFilename(label: string) {
  return `reports-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "download"}`;
}

function reportWhatsAppMessage(report: ReportDownloadData, profile: BusinessProfile) {
  const lines = [
    profile.businessName,
    "Reports",
    `Period: ${report.label}`,
    `From: ${report.from} To: ${report.to}`
  ];
  if (report.customerName) {
    lines.push(`Customer: ${report.customerName}`);
  }
  if (!report.customerFiltered) {
    lines.push(`Purchase: ₹${money(report.summary.purchase)}`);
  }
  lines.push(
    `Sales: ₹${money(report.summary.sales)}`,
    `Collection: ₹${money(report.summary.collection)}`,
    `Outstanding: ₹${money(report.summary.outstanding)}`
  );
  return lines.join("\n");
}

async function buildReportPdf(report: ReportDownloadData, profile: BusinessProfile) {
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

  return doc.output("blob");
}

export function ReportDownloadActions({
  report,
  profile = report.business ?? DEFAULT_BUSINESS_PROFILE
}: {
  report: ReportDownloadData;
  profile?: BusinessProfile;
}) {
  const filename = safeFilename(report.label);

  async function downloadPdf() {
    const blob = await buildReportPdf(report, profile);
    downloadBlob(`${filename}.pdf`, blob);
  }

  async function shareWhatsApp() {
    const blob = await buildReportPdf(report, profile);
    await sharePdfWithWhatsApp({
      filename: `${filename}.pdf`,
      blob,
      phone: profile.businessMobile,
      message: reportWhatsAppMessage(report, profile)
    });
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <Button type="button" variant="outline" size="lg" onClick={() => void downloadPdf()}>
        <Download className="h-5 w-5" />
        Download PDF
      </Button>
      <Button type="button" variant="secondary" size="lg" onClick={() => void shareWhatsApp()}>
        <MessageCircle className="h-5 w-5" />
        WhatsApp
      </Button>
    </div>
  );
}