"use client";

import { Download, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BusinessProfile, CustomerStatementDocument } from "@/lib/documents/types";
import { DEFAULT_BUSINESS_PROFILE } from "@/lib/documents/types";
import { downloadBlob } from "@/lib/documents/pdf-utils";
import { buildCustomerStatementPdf, customerStatementWhatsAppMessage } from "@/lib/documents/statement-pdf";
import { sharePdfWithWhatsApp } from "@/lib/documents/whatsapp";
import { formatRupee } from "@/lib/utils";

export function CustomerStatementActions({
  statement,
  profile = DEFAULT_BUSINESS_PROFILE
}: {
  statement: CustomerStatementDocument;
  profile?: BusinessProfile;
}) {
  const filename = `statement-${statement.customer.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`;

  async function downloadPdf() {
    const blob = await buildCustomerStatementPdf(statement, profile);
    downloadBlob(filename, blob);
  }

  async function shareWhatsApp() {
    const blob = await buildCustomerStatementPdf(statement, profile);
    await sharePdfWithWhatsApp({
      filename,
      blob,
      phone: statement.customer.mobile,
      message: customerStatementWhatsAppMessage(statement, profile)
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-md bg-muted p-3">
          <p className="text-sm text-muted-foreground">Opening Balance</p>
          <p className="font-semibold">{formatRupee(statement.openingBalance)}</p>
        </div>
        <div className="rounded-md bg-muted p-3">
          <p className="text-sm text-muted-foreground">Total Sales</p>
          <p className="font-semibold">{formatRupee(statement.totalSales)}</p>
        </div>
        <div className="rounded-md bg-accent p-3 text-accent-foreground">
          <p className="text-sm text-accent-foreground/80">Closing Balance</p>
          <p className="font-semibold">{formatRupee(statement.closingBalance)}</p>
        </div>
      </div>
      {statement.rows.length ? (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Date</th>
                <th className="px-3 py-2 text-left font-medium">Particulars</th>
                <th className="px-3 py-2 text-right font-medium">Debit</th>
                <th className="px-3 py-2 text-right font-medium">Credit</th>
                <th className="px-3 py-2 text-right font-medium">Balance</th>
              </tr>
            </thead>
            <tbody>
              {statement.rows.map((row, index) => (
                <tr key={`${row.date}-${row.particulars}-${index}`} className="border-t">
                  <td className="px-3 py-2">{row.date}</td>
                  <td className="px-3 py-2">{row.particulars}</td>
                  <td className="px-3 py-2 text-right">{row.debit ? formatRupee(row.debit) : "-"}</td>
                  <td className="px-3 py-2 text-right">{row.credit ? formatRupee(row.credit) : "-"}</td>
                  <td className="px-3 py-2 text-right font-medium">{formatRupee(row.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No transactions in this period.</p>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        <Button type="button" variant="outline" size="lg" onClick={() => void downloadPdf()}>
          <Download className="h-5 w-5" />
          Download Statement PDF
        </Button>
        <Button type="button" variant="secondary" size="lg" onClick={() => void shareWhatsApp()}>
          <MessageCircle className="h-5 w-5" />
          WhatsApp Statement
        </Button>
      </div>
    </div>
  );
}
