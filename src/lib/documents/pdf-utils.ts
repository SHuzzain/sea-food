export const LOGO_SRC = "/brand/arf-seafoods-logo.jpeg";

export function pdfMoney(value: number) {
  return `INR ${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function pdfPlainRate(value: number) {
  return Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export function pdfPlainKg(value: number) {
  return Number(value || 0)
    .toLocaleString("en-IN", { maximumFractionDigits: 3 })
    .replace(/\.?0+$/, "");
}

export function parsePdfAmount(value: string) {
  const cleaned = value.replace(/[₹,\s]/g, "").replace(/^INR/i, "");
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : null;
}

export function formatPdfSummaryValue(value: string) {
  const trimmed = value.trim();
  if (/^INR\s/i.test(trimmed)) {
    return trimmed;
  }
  const parsed = parsePdfAmount(trimmed);
  return parsed !== null ? pdfMoney(parsed) : trimmed;
}

export async function imageToDataUrl(src: string) {
  const response = await fetch(src);
  const blob = await response.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function getAutoTableFinalY(doc: unknown, fallback: number) {
  return (doc as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? fallback;
}

export function drawPdfBalanceFooter(
  doc: {
    addPage: () => void;
    text: (text: string, x: number, y: number, options?: { align?: "right" }) => void;
    internal: { pageSize: { getHeight: () => number } };
  },
  startY: number,
  rows: Array<[string, string]>
) {
  let y = startY + 12;
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + rows.length * 7 > pageHeight - 14) {
    doc.addPage();
    y = 20;
  }
  rows.forEach(([label, value], index) => {
    const lineY = y + index * 7;
    doc.text(label, 120, lineY);
    doc.text(value, 190, lineY, { align: "right" });
  });
}
