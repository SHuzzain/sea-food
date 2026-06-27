import type { jsPDF } from "jspdf";
import type { BusinessProfile } from "@/lib/documents/types";
import { imageToDataUrl, LOGO_SRC } from "@/lib/documents/pdf-utils";

export async function addPdfHeader(doc: jsPDF, profile: BusinessProfile) {
  const logoDataUrl = await imageToDataUrl(LOGO_SRC);
  doc.addImage(logoDataUrl, "JPEG", 14, 10, 24, 24);
  doc.setFontSize(16);
  doc.text(profile.businessName, 44, 18);
  doc.setFontSize(10);
  let y = 24;
  if (profile.businessTagline) {
    doc.text(profile.businessTagline, 44, y);
    y += 6;
  }
  if (profile.businessAddress) {
    const addressLines = doc.splitTextToSize(profile.businessAddress, 150);
    doc.text(addressLines, 44, y);
    y += addressLines.length * 5;
  }
  if (profile.businessMobile) {
    doc.text(`Mobile: ${profile.businessMobile}`, 44, y);
    y += 6;
  }
  return Math.max(y + 8, 42);
}
