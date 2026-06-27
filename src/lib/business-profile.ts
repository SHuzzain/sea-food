import "server-only";

import { prisma } from "@/lib/prisma";
import { DEFAULT_BUSINESS_PROFILE, type BusinessProfile } from "@/lib/documents/types";

export async function getBusinessProfile(): Promise<BusinessProfile> {
  try {
    const settings = await prisma.appSettings.findUnique({ where: { id: "default" } });
    if (!settings) {
      return DEFAULT_BUSINESS_PROFILE;
    }
    return {
      businessName: settings.businessName,
      businessTagline: settings.businessTagline,
      businessAddress: settings.businessAddress,
      businessMobile: settings.businessMobile
    };
  } catch {
    return DEFAULT_BUSINESS_PROFILE;
  }
}
