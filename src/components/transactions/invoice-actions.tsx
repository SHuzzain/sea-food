"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Download, MessageCircle, Printer } from "lucide-react";
import { deleteSale } from "@/app/(app)/sale/actions";
import { EditSaleDialog } from "@/components/transactions/edit-sale-dialog";
import { TransactionItemMenu } from "@/components/transactions/transaction-item-menu";
import { Button } from "@/components/ui/button";
import type { SavedSale } from "@/app/(app)/sale/actions";
import type { BusinessProfile } from "@/lib/documents/types";
import { DEFAULT_BUSINESS_PROFILE } from "@/lib/documents/types";
import { buildInvoicePdf, invoiceWhatsAppMessage } from "@/lib/documents/invoice-pdf";
import { downloadBlob } from "@/lib/documents/pdf-utils";
import { sharePdfWithWhatsApp } from "@/lib/documents/whatsapp";
import type { SelectOption } from "@/lib/options";
import type { EditableSale } from "@/lib/transactions/types";
import { formatKg, formatRupee } from "@/lib/utils";

const logoSrc = "/brand/arf-seafoods-logo.jpeg";

export function InvoiceActions({
  sale,
  compact = false,
  profile = DEFAULT_BUSINESS_PROFILE,
  editable,
  customers,
  products
}: {
  sale: SavedSale;
  compact?: boolean;
  profile?: BusinessProfile;
  editable?: EditableSale;
  customers?: SelectOption[];
  products?: SelectOption[];
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);

  async function downloadPdf() {
    const blob = await buildInvoicePdf(sale, profile);
    downloadBlob(`${sale.invoiceNo}.pdf`, blob);
  }

  async function shareWhatsApp() {
    const blob = await buildInvoicePdf(sale, profile);
    await sharePdfWithWhatsApp({
      filename: `${sale.invoiceNo}.pdf`,
      blob,
      phone: sale.customer.mobile,
      message: invoiceWhatsAppMessage(sale, profile)
    });
  }

  async function handleDelete() {
    if (!editable || !window.confirm(`Delete sale ${sale.invoiceNo}? Customer balance will be recalculated.`)) {
      return;
    }
    const result = await deleteSale(editable.id);
    if (!result.ok) {
      window.alert(result.error ?? "Unable to delete sale.");
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
          onEdit={editable && customers && products ? () => setEditOpen(true) : undefined}
          onDelete={editable ? handleDelete : undefined}
        />
        {editable && customers && products ? (
          <EditSaleDialog open={editOpen} onOpenChange={setEditOpen} sale={editable} customers={customers} products={products} />
        ) : null}
      </>
    );
  }

  return (
    <>
      <div className="grid gap-2 sm:grid-cols-3">
        <Button type="button" variant="outline" size="lg" onClick={() => window.print()}>
          <Printer className="h-5 w-5" />
          Print
        </Button>
        <Button type="button" variant="outline" size="lg" aria-label="Download invoice PDF" onClick={() => void downloadPdf()}>
          <Download className="h-5 w-5" />
          Download PDF
        </Button>
        <Button type="button" variant="secondary" size="lg" aria-label="Share invoice on WhatsApp" onClick={() => void shareWhatsApp()}>
          <MessageCircle className="h-5 w-5" />
          WhatsApp
        </Button>
      </div>

      <div className="print-invoice">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <Image src={logoSrc} alt="ARF Seafoods logo" width={64} height={64} style={{ objectFit: "cover" }} />
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{profile.businessName}</h1>
            <p style={{ margin: "4px 0 0", fontSize: 12 }}>{profile.businessTagline}</p>
            {profile.businessAddress ? <p style={{ margin: "4px 0 0", fontSize: 11 }}>{profile.businessAddress}</p> : null}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
          <div>
            <p>Customer: {sale.customer.name}</p>
            <p>Mobile: {sale.customer.mobile || "-"}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p>Invoice No: {sale.invoiceNo}</p>
            <p>Invoice Date: {sale.invoiceDate}</p>
          </div>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 16 }}>
          <thead>
            <tr>
              <th style={{ border: "1px solid #111", padding: 6, textAlign: "left" }}>Product</th>
              <th style={{ border: "1px solid #111", padding: 6, textAlign: "right" }}>Kg</th>
              <th style={{ border: "1px solid #111", padding: 6, textAlign: "right" }}>Rate</th>
              <th style={{ border: "1px solid #111", padding: 6, textAlign: "right" }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((item) => (
              <tr key={`${item.productName}-${item.kg}-${item.rate}`}>
                <td style={{ border: "1px solid #111", padding: 6 }}>{item.productName}</td>
                <td style={{ border: "1px solid #111", padding: 6, textAlign: "right" }}>{formatKg(item.kg)}</td>
                <td style={{ border: "1px solid #111", padding: 6, textAlign: "right" }}>{formatRupee(item.rate)}</td>
                <td style={{ border: "1px solid #111", padding: 6, textAlign: "right" }}>{formatRupee(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginLeft: "auto", width: 260 }}>
          <p style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Previous Balance</span>
            <strong>{formatRupee(sale.previousBalance)}</strong>
          </p>
          <p style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Total Amount</span>
            <strong>{formatRupee(sale.totalAmount)}</strong>
          </p>
          <p style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Received Amount</span>
            <strong>{formatRupee(sale.receivedAmount)}</strong>
          </p>
          <p style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Current Balance</span>
            <strong>{formatRupee(sale.currentBalance)}</strong>
          </p>
        </div>
      </div>
    </>
  );
}