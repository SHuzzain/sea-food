"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type SettingsPayload = {
  businessName: string;
  businessTagline: string;
  businessAddress: string;
  businessMobile: string;
};

export async function updateAppSettings(payload: SettingsPayload) {
  await requireUser();

  await prisma.appSettings.upsert({
    where: { id: "default" },
    update: {
      businessName: payload.businessName.trim() || "ARF Seafoods",
      businessTagline: payload.businessTagline.trim(),
      businessAddress: payload.businessAddress.trim(),
      businessMobile: payload.businessMobile.trim()
    },
    create: {
      id: "default",
      businessName: payload.businessName.trim() || "ARF Seafoods",
      businessTagline: payload.businessTagline.trim(),
      businessAddress: payload.businessAddress.trim(),
      businessMobile: payload.businessMobile.trim()
    }
  });

  revalidatePath("/settings");
  revalidatePath("/sale");
  revalidatePath("/payment");
  revalidatePath("/reports");
  return { ok: true };
}