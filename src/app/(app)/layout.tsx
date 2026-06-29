import { Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/lib/auth";

async function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return <AppShell user={user}>{children}</AppShell>;
}

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-background" />}>
      <AuthenticatedShell>{children}</AuthenticatedShell>
    </Suspense>
  );
}