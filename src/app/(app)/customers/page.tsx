import { CustomerManager, type CustomerRow } from "@/components/masters/customer-manager";
import { prisma } from "@/lib/prisma";
import { decimalToNumber } from "@/lib/utils";

export default async function CustomersPage() {
  const customers = await prisma.customer.findMany({
    orderBy: { name: "asc" }
  });

  const rows: CustomerRow[] = customers.map((customer) => ({
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
      <CustomerManager customers={rows} />
    </div>
  );
}
