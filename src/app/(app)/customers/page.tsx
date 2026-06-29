import { Suspense } from "react";
import { CustomerManager, type CustomerRow } from "@/components/masters/customer-manager";
import { getCachedCustomersPage } from "@/lib/cache/queries";
import { parsePageParam } from "@/lib/pagination";
import { decimalToNumber } from "@/lib/utils";

type CustomersPageProps = {
  searchParams: Promise<{
    page?: string;
    q?: string;
  }>;
};

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const params = await searchParams;
  const page = parsePageParam(params.page);
  const query = params.q?.trim() ?? "";
  const { items, pagination } = await getCachedCustomersPage(page, query);

  const rows: CustomerRow[] = items.map((customer) => ({
    id: customer.id,
    name: customer.name,
    mobile: customer.mobile ?? "",
    address: customer.address ?? "",
    openingBalance: decimalToNumber(customer.openingBalance),
    outstandingBalance: decimalToNumber(customer.outstandingBalance),
    status: customer.status
  }));

  return (
    <div className="app-container py-5 lg:py-8">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold tracking-normal">Customers</h1>
        <p className="text-sm text-muted-foreground">Create, edit, delete and search customer accounts.</p>
      </div>
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading customers...</div>}>
        <CustomerManager customers={rows} pagination={pagination} query={query} />
      </Suspense>
    </div>
  );
}