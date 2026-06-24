import { prisma } from "@/lib/prisma";
import { decimalToNumber } from "@/lib/utils";

export type SelectOption = {
  id: string;
  label: string;
  meta?: string;
  balance?: number;
  unit?: string;
};

export async function getCustomerOptions(): Promise<SelectOption[]> {
  const customers = await prisma.customer.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, mobile: true, outstandingBalance: true }
  });
  return customers.map((customer) => ({
    id: customer.id,
    label: customer.name,
    meta: customer.mobile ?? "",
    balance: decimalToNumber(customer.outstandingBalance)
  }));
}

export async function getSupplierOptions(): Promise<SelectOption[]> {
  const suppliers = await prisma.supplier.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, mobile: true }
  });
  return suppliers.map((supplier) => ({
    id: supplier.id,
    label: supplier.name,
    meta: supplier.mobile ?? ""
  }));
}

export async function getProductOptions(): Promise<SelectOption[]> {
  const products = await prisma.product.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, unit: true }
  });
  return products.map((product) => ({
    id: product.id,
    label: product.name,
    meta: product.unit,
    unit: product.unit
  }));
}
