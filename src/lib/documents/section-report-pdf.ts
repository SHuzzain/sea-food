import type { BusinessProfile } from "@/lib/documents/types";
import { addPdfHeader } from "@/lib/documents/pdf-header";
import { pdfTableOptions } from "@/lib/documents/pdf-table";
import {
  drawPdfBalanceFooter,
  formatPdfSummaryValue,
  getAutoTableFinalY,
  parsePdfAmount,
  pdfMoney
} from "@/lib/documents/pdf-utils";

export type SectionReportData = {
  title: string;
  periodLabel: string;
  from: string;
  to: string;
  customerName?: string;
  metaLines?: Array<{ label: string; value: string }>;
  openingBalance?: number;
  head: string[];
  rows: Array<Array<string | number>>;
  totalRow?: Array<string | number>;
  summaryRows?: Array<{ label: string; value: string }>;
};

const META_LABELS = new Set(["Supplier", "Product", "Customer"]);
const BALANCE_SUMMARY_ORDER = ["Previous Balance", "Total Amount", "Paid Amount", "Received Amount", "Current Balance"];

function orderedBalanceSummary(summaryRows?: SectionReportData["summaryRows"]) {
  return BALANCE_SUMMARY_ORDER.map((label) => summaryRows?.find((row) => row.label === label)).filter(
    (row): row is { label: string; value: string } => Boolean(row)
  );
}

function formatMoneyCell(header: string, value: string | number) {
  const text = String(value ?? "").trim();
  if (!text || text === "-") {
    return text || "-";
  }
  if (!["Amount", "Paid", "Balance", "Received"].includes(header)) {
    return text;
  }
  const number = Number(text.replace(/,/g, ""));
  return Number.isFinite(number) ? pdfMoney(number) : text;
}

function formatTableRow(head: string[], row: Array<string | number>) {
  return head.map((column, index) => formatMoneyCell(column, row[index] ?? ""));
}

function footerSummaryRows(summaryRows?: SectionReportData["summaryRows"]) {
  const balanceRows = orderedBalanceSummary(summaryRows);
  if (balanceRows.length) {
    return balanceRows;
  }
  return (summaryRows ?? []).filter((row) => !META_LABELS.has(row.label));
}

function resolveMetaLines(section: SectionReportData) {
  if (section.metaLines?.length) {
    return section.metaLines;
  }
  if (section.customerName) {
    return [{ label: "Party", value: section.customerName }];
  }
  return [];
}

function resolveOpeningBalance(section: SectionReportData) {
  if (section.openingBalance !== undefined) {
    return section.openingBalance;
  }
  const previous = section.summaryRows?.find((row) => row.label === "Previous Balance");
  if (!previous) {
    return undefined;
  }
  return parsePdfAmount(previous.value) ?? undefined;
}

export async function buildSectionPdf(section: SectionReportData, profile: BusinessProfile) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF();
  const headerEndY = await addPdfHeader(doc, profile);

  doc.setFontSize(14);
  doc.text(section.title, 14, headerEndY);
  doc.setFontSize(10);

  let metaY = headerEndY + 10;
  for (const line of resolveMetaLines(section)) {
    doc.text(`${line.label}: ${line.value}`, 14, metaY);
    metaY += 6;
  }

  doc.text(`Period: ${section.from} to ${section.to}`, 14, metaY);
  metaY += 6;

  const openingBalance = resolveOpeningBalance(section);
  const hasBalanceFooter = orderedBalanceSummary(section.summaryRows).length > 0;
  if (openingBalance !== undefined && !hasBalanceFooter) {
    doc.text(`Opening Balance: ${pdfMoney(openingBalance)}`, 14, metaY);
    metaY += 6;
  }

  const body = section.rows.length
    ? [
        ...section.rows.map((row) => formatTableRow(section.head, row)),
        ...(section.totalRow ? [formatTableRow(section.head, section.totalRow)] : [])
      ]
    : [["No records", ...section.head.slice(1).map(() => "")]];

  autoTable(doc, pdfTableOptions(section.head, body, metaY + 4));

  const summary = footerSummaryRows(section.summaryRows);
  if (summary.length) {
    drawPdfBalanceFooter(
      doc,
      getAutoTableFinalY(doc, metaY + 20),
      summary.map((row) => [row.label, formatPdfSummaryValue(row.value)])
    );
  }

  return doc.output("blob");
}

export function sectionWhatsAppMessage(section: SectionReportData, profile: BusinessProfile) {
  const lines = [profile.businessName, section.title, `Period: ${section.from} to ${section.to}`];
  resolveMetaLines(section).forEach((line) => lines.push(`${line.label}: ${line.value}`));
  footerSummaryRows(section.summaryRows).forEach((row) => lines.push(`${row.label}: ${row.value}`));
  lines.push(`Records: ${section.rows.length}`);
  return lines.join("\n");
}