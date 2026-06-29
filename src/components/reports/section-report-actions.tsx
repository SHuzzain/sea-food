"use client";

import { Download, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BusinessProfile } from "@/lib/documents/types";
import { DEFAULT_BUSINESS_PROFILE } from "@/lib/documents/types";
import { addPdfHeader } from "@/lib/documents/pdf-header";
import { downloadBlob } from "@/lib/documents/pdf-utils";
import { sharePdfWithWhatsApp } from "@/lib/documents/whatsapp";

export type SectionReportData = {
  title: string;
  periodLabel: string;
  from: string;
  to: string;
  customerName?: string;
  head: string[];
  rows: Array<Array<string | number>>;
  totalRow?: Array<string | number>;
  summaryRows?: Array<{ label: string; value: string }>;
};

function safeFilename(title: string, periodLabel: string) {
  const slug = `${title}-${periodLabel}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return slug || "report";
}

function sectionWhatsAppMessage(section: SectionReportData, profile: BusinessProfile) {
  const lines = [
    profile.businessName,
    section.title,
    `Period: ${section.periodLabel}`,
    `From: ${section.from} To: ${section.to}`
  ];
  if (section.customerName) {
    lines.push(`Customer: ${section.customerName}`);
  }
  section.summaryRows?.forEach((row) => lines.push(`${row.label}: ${row.value}`));
  lines.push(`Records: ${section.rows.length}`);
  return lines.join("\n");
}

async function buildSectionPdf(section: SectionReportData, profile: BusinessProfile) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF();
  const headerEndY = await addPdfHeader(doc, profile);

  doc.setFontSize(14);
  doc.text(section.title, 14, headerEndY);
  doc.setFontSize(10);
  let metaY = headerEndY + 8;
  doc.text(`Period: ${section.periodLabel}`, 14, metaY);
  metaY += 6;
  doc.text(`From: ${section.from}  To: ${section.to}`, 14, metaY);
  metaY += 6;
  if (section.customerName) {
    doc.text(`Customer: ${section.customerName}`, 14, metaY);
    metaY += 6;
  }

  const body = section.rows.length
    ? [...section.rows.map((row) => row.map((cell) => String(cell))), ...(section.totalRow ? [section.totalRow.map((cell) => String(cell))] : [])]
    : [["No records"]];

  autoTable(doc, {
    startY: metaY + 4,
    head: [section.head],
    body,
    styles: { fontSize: 8 }
  });

  return doc.output("blob");
}

export function SectionReportActions({
  section,
  profile = DEFAULT_BUSINESS_PROFILE,
  compact = false
}: {
  section: SectionReportData;
  profile?: BusinessProfile;
  compact?: boolean;
}) {
  const filename = safeFilename(section.title, section.periodLabel);

  async function downloadPdf() {
    const blob = await buildSectionPdf(section, profile);
    downloadBlob(`${filename}.pdf`, blob);
  }

  async function shareWhatsApp() {
    const blob = await buildSectionPdf(section, profile);
    await sharePdfWithWhatsApp({
      filename: `${filename}.pdf`,
      blob,
      phone: profile.businessMobile,
      message: sectionWhatsAppMessage(section, profile)
    });
  }

  return (
    <div className={compact ? "grid grid-cols-2 gap-2" : "grid gap-2 sm:grid-cols-2"}>
      <Button type="button" variant="outline" size={compact ? "sm" : "default"} onClick={() => void downloadPdf()}>
        <Download className="h-4 w-4" />
        {compact ? "Download" : "Download PDF"}
      </Button>
      <Button type="button" variant="secondary" size={compact ? "sm" : "default"} onClick={() => void shareWhatsApp()}>
        <MessageCircle className="h-4 w-4" />
        WhatsApp
      </Button>
    </div>
  );
}

