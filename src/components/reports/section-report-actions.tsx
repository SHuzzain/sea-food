"use client";

import { Download, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BusinessProfile } from "@/lib/documents/types";
import { DEFAULT_BUSINESS_PROFILE } from "@/lib/documents/types";
import {
  buildSectionPdf,
  sectionWhatsAppMessage,
  type SectionReportData
} from "@/lib/documents/section-report-pdf";
import { downloadBlob } from "@/lib/documents/pdf-utils";
import { sharePdfWithWhatsApp } from "@/lib/documents/whatsapp";

export type { SectionReportData };

const BALANCE_SUMMARY_ORDER = ["Previous Balance", "Total Amount", "Paid Amount", "Received Amount", "Current Balance"];

function orderedBalanceSummary(section: SectionReportData) {
  return BALANCE_SUMMARY_ORDER.map((label) => section.summaryRows?.find((row) => row.label === label)).filter(
    (row): row is { label: string; value: string } => Boolean(row)
  );
}

function safeFilename(title: string, periodLabel: string) {
  const slug = `${title}-${periodLabel}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return slug || "report";
}

export function SectionReportActions({
  section,
  profile = DEFAULT_BUSINESS_PROFILE,
  compact = false,
  showSummary = false
}: {
  section: SectionReportData;
  profile?: BusinessProfile;
  compact?: boolean;
  showSummary?: boolean;
}) {
  const filename = safeFilename(section.title, section.periodLabel);
  const balanceSummary = orderedBalanceSummary(section);

  async function downloadPdf() {
    const blob = await buildSectionPdf(section, profile);
    downloadBlob(`${filename}.pdf`, blob);
  }

  async function shareWhatsApp() {
    const blob = await buildSectionPdf(section, profile);
    await sharePdfWithWhatsApp({
      filename: `${filename}.pdf`,
      blob,
      phone: profile.businessMobile,
      message: sectionWhatsAppMessage(section, profile)
    });
  }

  return (
    <div className="space-y-3">
      {showSummary && balanceSummary.length ? (
        <div className="ml-auto w-full max-w-md space-y-1.5 py-1 text-sm">
          {balanceSummary.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-8">
              <span className="font-medium">{row.label}</span>
              <span className="tabular-nums">{row.value}</span>
            </div>
          ))}
        </div>
      ) : null}
      <div className={compact ? "grid grid-cols-2 gap-2" : "grid gap-2 sm:grid-cols-2"}>
        <Button type="button" variant="outline" size={compact ? "sm" : "default"} onClick={() => void downloadPdf()}>
          <Download className="h-4 w-4" />
          {compact ? "Download" : "Download PDF"}
        </Button>
        <Button type="button" variant="secondary" size={compact ? "sm" : "default"} onClick={() => void shareWhatsApp()}>
          <MessageCircle className="h-4 w-4" />
          WhatsApp
        </Button>
      </div>
    </div>
  );
}