import type { UserOptions } from "jspdf-autotable";

const HEADER_BLUE: [number, number, number] = [41, 128, 185];
const STRIPE_GRAY: [number, number, number] = [245, 245, 245];
const TOTAL_GRAY: [number, number, number] = [230, 230, 230];

const MONEY_HEADERS = new Set(["Amount", "Paid", "Balance", "Received", "Debit", "Credit", "Outstanding"]);
const RIGHT_ALIGN_HEADERS = new Set([...MONEY_HEADERS, "Rate", "Kg"]);

export function moneyColumnStyles(head: string[]): Record<number, { halign: "right" }> {
  const styles: Record<number, { halign: "right" }> = {};
  head.forEach((column, index) => {
    if (RIGHT_ALIGN_HEADERS.has(column)) {
      styles[index] = { halign: "right" };
    }
  });
  return styles;
}

export function pdfTableOptions(head: string[], body: string[][], startY: number, options?: Partial<UserOptions>): UserOptions {
  const hasTotalRow = body.length > 1 && body[body.length - 1][0] === "Total";
  const totalRowIndex = hasTotalRow ? body.length - 1 : -1;

  return {
    startY,
    head: [head],
    body,
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      lineColor: [220, 220, 220],
      lineWidth: 0.1
    },
    headStyles: {
      fillColor: HEADER_BLUE,
      textColor: 255,
      fontStyle: "bold",
      halign: "left"
    },
    alternateRowStyles: {
      fillColor: STRIPE_GRAY
    },
    columnStyles: moneyColumnStyles(head),
    didParseCell: (data) => {
      if (totalRowIndex >= 0 && data.section === "body" && data.row.index === totalRowIndex) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = TOTAL_GRAY;
      }
      if (data.section === "head" && RIGHT_ALIGN_HEADERS.has(head[data.column.index])) {
        data.cell.styles.halign = "right";
      }
    },
    ...options
  };
}