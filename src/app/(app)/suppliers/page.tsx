import { SupplierManager, type SupplierRow } from "@/components/masters/supplier-manager";
import { prisma } from "@/lib/prisma";

export default async function SuppliersPage() {
  const suppliers = await prisma.supplier.findMany({
    orderBy: { name: "asc" }
  });

  const rows: SupplierRow[] = suppliers.map((supplier) => ({
    id: supplier.id,
    name: supplier.name,
    mobile: supplier.mobile ?? "",
    address: supplier.address ?? "",
    status: supplier.status
  }));

  return (
    <div className="app-container py-5 lg:py-8">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold tracking-normal">Suppliers</h1>
        <p className="text-sm text-muted-foreground">Create, edit, delete and search suppliers.</p>
      </div>
      <SupplierManager suppliers={rows} />
    </div>
  );
}
