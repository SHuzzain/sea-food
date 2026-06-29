"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, MessageCircle } from "lucide-react";
import { deletePayment } from "@/app/(app)/payment/actions";
import { EditPaymentDialog } from "@/components/transactions/edit-payment-dialog";
import { TransactionItemMenu } from "@/components/transactions/transaction-item-menu";
import { Button } from "@/components/ui/button";
import type { BusinessProfile, PaymentReceiptDocument } from "@/lib/documents/types";
import { DEFAULT_BUSINESS_PROFILE } from "@/lib/documents/types";
import { buildPaymentReceiptPdf, paymentReceiptWhatsAppMessage } from "@/lib/documents/payment-receipt-pdf";
import { downloadBlob } from "@/lib/documents/pdf-utils";
import { sharePdfWithWhatsApp } from "@/lib/documents/whatsapp";
import type { SelectOption } from "@/lib/options";
import type { EditablePayment } from "@/lib/transactions/types";

export function PaymentReceiptActions({
  receipt,
  compact = false,
  profile = DEFAULT_BUSINESS_PROFILE,
  editable,
  customers
}: {
  receipt: PaymentReceiptDocument;
  compact?: boolean;
  profile?: BusinessProfile;
  editable?: EditablePayment;
  customers?: SelectOption[];
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);

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

  async function handleDelete() {
    if (!editable || !window.confirm("Delete this payment? Customer balance will be recalculated.")) {
      return;
    }
    const result = await deletePayment(editable.id);
    if (!result.ok) {
      window.alert(result.error ?? "Unable to delete payment.");
      return;
    }
    router.refresh();
  }

  if (compact) {
    return (
      <>
        <TransactionItemMenu
          onDownload={downloadPdf}
          onWhatsApp={shareWhatsApp}
          onEdit={editable && customers ? () => setEditOpen(true) : undefined}
          onDelete={editable ? handleDelete : undefined}
        />
        {editable && customers ? (
          <EditPaymentDialog open={editOpen} onOpenChange={setEditOpen} payment={editable} customers={customers} />
        ) : null}
      </>
    );
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