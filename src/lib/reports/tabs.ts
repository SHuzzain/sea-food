export const REPORT_TABS = [
  { id: "purchase", label: "Purchase" },
  { id: "sales", label: "Sales" },
  { id: "outstanding", label: "Outstanding" },
  { id: "payment", label: "Payment" }
] as const;

export type ReportTab = (typeof REPORT_TABS)[number]["id"];

export const DEFAULT_REPORT_TAB: ReportTab = "sales";

export function isReportTab(value: string | undefined): value is ReportTab {
  return REPORT_TABS.some((tab) => tab.id === value);
}