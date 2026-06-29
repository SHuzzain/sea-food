import { Suspense } from "react";
import { SupplierManager, type SupplierRow } from "@/components/masters/supplier-manager";
import { getCachedSuppliersPage } from "@/lib/cache/queries";
import { parsePageParam } from "@/lib/pagination";
import { decimalToNumber } from "@/lib/utils";

type SuppliersPageProps = {
  searchParams: Promise<{
    page?: string;
    q?: string;
  }>;
};

export default async function SuppliersPage({ searchParams }: SuppliersPageProps) {
  const params = await searchParams;
  const page = parsePageParam(params.page);
  const query = params.q?.trim() ?? "";
  const { items, pagination } = await getCachedSuppliersPage(page, query);

  const rows: SupplierRow[] = items.map((supplier) => ({
    id: supplier.id,
    name: supplier.name,
    mobile: supplier.mobile ?? "",
    address: supplier.address ?? "",
    openingBalance: decimalToNumber(supplier.openingBalance),
    outstandingBalance: decimalToNumber(supplier.outstandingBalance),
    status: supplier.status
  }));

  return (
    <div className="app-container py-5 lg:py-8">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold tracking-normal">Suppliers</h1>
        <p className="text-sm text-muted-foreground">Create, edit, delete and search suppliers.</p>
      </div>
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading suppliers...</div>}>
        <SupplierManager suppliers={rows} pagination={pagination} query={query} />
      </Suspense>
    </div>
  );
}