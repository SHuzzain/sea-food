import { SettingsForm } from "@/app/(app)/settings/settings-form";
import { getBusinessProfile } from "@/lib/business-profile";

export default async function SettingsPage() {
  const settings = await getBusinessProfile();

  return (
    <div className="app-container py-5 lg:py-8">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold tracking-normal">Settings</h1>
        <p className="text-sm text-muted-foreground">Business details shown on invoices, receipts and statements.</p>
      </div>
      <SettingsForm settings={settings} />
    </div>
  );
}
