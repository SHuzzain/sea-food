"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, MessageCircle } from "lucide-react";
import { deleteSupplierPayment } from "@/app/(app)/payment/supplier-actions";
import { EditSupplierPaymentDialog } from "@/components/transactions/edit-supplier-payment-dialog";
import { TransactionItemMenu } from "@/components/transactions/transaction-item-menu";
import { Button } from "@/components/ui/button";
import type { BusinessProfile, SupplierPaymentReceiptDocument } from "@/lib/documents/types";
import { DEFAULT_BUSINESS_PROFILE } from "@/lib/documents/types";
import {
  buildSupplierPaymentReceiptPdf,
  supplierPaymentReceiptWhatsAppMessage
} from "@/lib/documents/supplier-payment-receipt-pdf";
import { downloadBlob } from "@/lib/documents/pdf-utils";
import { sharePdfWithWhatsApp } from "@/lib/documents/whatsapp";
import type { SelectOption } from "@/lib/options";
import type { EditableSupplierPayment } from "@/lib/transactions/types";

export function SupplierPaymentReceiptActions({
  receipt,
  compact = false,
  profile = DEFAULT_BUSINESS_PROFILE,
  editable,
  suppliers
}: {
  receipt: SupplierPaymentReceiptDocument;
  compact?: boolean;
  profile?: BusinessProfile;
  editable?: EditableSupplierPayment;
  suppliers?: SelectOption[];
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);

  async function downloadPdf() {
    const blob = await buildSupplierPaymentReceiptPdf(receipt, profile);
    downloadBlob(`supplier-payment-${receipt.refNo}.pdf`, blob);
  }

  async function shareWhatsApp() {
    const blob = await buildSupplierPaymentReceiptPdf(receipt, profile);
    await sharePdfWithWhatsApp({
      filename: `supplier-payment-${receipt.refNo}.pdf`,
      blob,
      phone: receipt.supplier.mobile,
      message: supplierPaymentReceiptWhatsAppMessage(receipt, profile)
    });
  }

  async function handleDelete() {
    if (!editable || !window.confirm("Delete this payment? Supplier balance will be recalculated.")) {
      return;
    }
    const result = await deleteSupplierPayment(editable.id);
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
          onEdit={editable && suppliers ? () => setEditOpen(true) : undefined}
          onDelete={editable ? handleDelete : undefined}
        />
        {editable && suppliers ? (
          <EditSupplierPaymentDialog open={editOpen} onOpenChange={setEditOpen} payment={editable} suppliers={suppliers} />
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