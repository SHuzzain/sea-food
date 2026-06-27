"use client";

import { Download, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BusinessProfile, PaymentReceiptDocument } from "@/lib/documents/types";
import { DEFAULT_BUSINESS_PROFILE } from "@/lib/documents/types";
import { buildPaymentReceiptPdf, paymentReceiptWhatsAppMessage } from "@/lib/documents/payment-receipt-pdf";
import { downloadBlob } from "@/lib/documents/pdf-utils";
import { sharePdfWithWhatsApp } from "@/lib/documents/whatsapp";

export function PaymentReceiptActions({
  receipt,
  compact = false,
  profile = DEFAULT_BUSINESS_PROFILE
}: {
  receipt: PaymentReceiptDocument;
  compact?: boolean;
  profile?: BusinessProfile;
}) {
  async function downloadPdf() {
    const blob = await buildPaymentReceiptPdf(receipt, profile);
    downloadBlob(`payment-${receipt.refNo}.pdf`, blob);
  }

  async function shareWhatsApp() {
    const blob = await buildPaymentReceiptPdf(receipt, profile);
    await sharePdfWithWhatsApp({
      filename: `payment-${receipt.refNo}.pdf`,
      blob,
      phone: receipt.customer.mobile,
      message: paymentReceiptWhatsAppMessage(receipt, profile)
    });
  }

  return (
    <div className={compact ? "grid gap-2 sm:grid-cols-2" : "grid gap-2 sm:grid-cols-2"}>
      <Button type="button" variant="outline" size={compact ? "default" : "lg"} onClick={() => void downloadPdf()}>
        <Download className={compact ? "h-4 w-4" : "h-5 w-5"} />
        Download PDF
      </Button>
      <Button type="button" variant="secondary" size={compact ? "default" : "lg"} onClick={() => void shareWhatsApp()}>
        <MessageCircle className={compact ? "h-4 w-4" : "h-5 w-5"} />
        WhatsApp
      </Button>
    </div>
  );
}
