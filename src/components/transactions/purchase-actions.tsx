"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, MessageCircle } from "lucide-react";
import { deletePurchase } from "@/app/(app)/purchase/actions";
import { EditPurchaseDialog } from "@/components/transactions/edit-purchase-dialog";
import { TransactionItemMenu } from "@/components/transactions/transaction-item-menu";
import { Button } from "@/components/ui/button";
import type { BusinessProfile, PurchaseDocument } from "@/lib/documents/types";
import { DEFAULT_BUSINESS_PROFILE } from "@/lib/documents/types";
import { buildPurchasePdf, purchaseWhatsAppMessage } from "@/lib/documents/purchase-pdf";
import { downloadBlob } from "@/lib/documents/pdf-utils";
import { sharePdfWithWhatsApp } from "@/lib/documents/whatsapp";
import type { SelectOption } from "@/lib/options";
import type { EditablePurchase } from "@/lib/transactions/types";

export function PurchaseActions({
  purchase,
  compact = false,
  profile = DEFAULT_BUSINESS_PROFILE,
  editable,
  suppliers,
  products
}: {
  purchase: PurchaseDocument;
  compact?: boolean;
  profile?: BusinessProfile;
  editable?: EditablePurchase;
  suppliers?: SelectOption[];
  products?: SelectOption[];
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);

  async function downloadPdf() {
    const blob = await buildPurchasePdf(purchase, profile);
    downloadBlob(`${purchase.refNo}.pdf`, blob);
  }

  async function shareWhatsApp() {
    const blob = await buildPurchasePdf(purchase, profile);
    await sharePdfWithWhatsApp({
      filename: `${purchase.refNo}.pdf`,
      blob,
      phone: purchase.supplier.mobile,
      message: purchaseWhatsAppMessage(purchase, profile)
    });
  }

  async function handleDelete() {
    if (!editable || !window.confirm("Delete this purchase? Supplier balance will be recalculated.")) {
      return;
    }
    const result = await deletePurchase(editable.id);
    if (!result.ok) {
      window.alert(result.error ?? "Unable to delete purchase.");
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
          onEdit={editable && suppliers && products ? () => setEditOpen(true) : undefined}
          onDelete={editable ? handleDelete : undefined}
        />
        {editable && suppliers && products ? (
          <EditPurchaseDialog open={editOpen} onOpenChange={setEditOpen} purchase={editable} suppliers={suppliers} products={products} />
        ) : null}
      </>
    );
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <Button type="button" variant="outline" size="lg" aria-label="Download purchase PDF" onClick={() => void downloadPdf()}>
        <Download className="h-5 w-5" />
        Download PDF
      </Button>
      <Button type="button" variant="secondary" size="lg" aria-label="Share purchase on WhatsApp" onClick={() => void shareWhatsApp()}>
        <MessageCircle className="h-5 w-5" />
        WhatsApp
      </Button>
    </div>
  );
}