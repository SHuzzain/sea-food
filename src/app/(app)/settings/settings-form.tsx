"use client";

import { FormEvent, useTransition } from "react";
import { Save } from "lucide-react";
import { updateAppSettings } from "@/app/(app)/settings/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { BusinessProfile } from "@/lib/documents/types";

export function SettingsForm({ settings }: { settings: BusinessProfile }) {
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(() => {
      void updateAppSettings({
        businessName: String(form.get("businessName") ?? ""),
        businessTagline: String(form.get("businessTagline") ?? ""),
        businessAddress: String(form.get("businessAddress") ?? ""),
        businessMobile: String(form.get("businessMobile") ?? "")
      });
    });
  }

  return (
    <form onSubmit={submit}>
      <Card>
        <CardHeader>
          <CardTitle>Business Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="businessName">Business Name</Label>
            <Input id="businessName" name="businessName" defaultValue={settings.businessName} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="businessTagline">Tagline</Label>
            <Input id="businessTagline" name="businessTagline" defaultValue={settings.businessTagline} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="businessAddress">Address</Label>
            <Textarea id="businessAddress" name="businessAddress" defaultValue={settings.businessAddress} rows={3} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="businessMobile">Business Mobile</Label>
            <Input id="businessMobile" name="businessMobile" defaultValue={settings.businessMobile} inputMode="tel" />
          </div>
          <Button type="submit" size="lg" disabled={pending}>
            <Save className="h-5 w-5" />
            {pending ? "Saving..." : "Save Settings"}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
