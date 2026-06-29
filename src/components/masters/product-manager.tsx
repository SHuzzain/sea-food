"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Edit2, Plus, Trash2 } from "lucide-react";
import { createProduct, deleteProduct, updateProduct, type ProductPayload } from "@/app/(app)/products/actions";
import { MasterListToolbar } from "@/components/masters/master-list-toolbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { SelectNative } from "@/components/ui/select-native";
import type { PageMeta } from "@/lib/pagination";

export type ProductRow = {
  id: string;
  name: string;
  unit: string;
  status: "ACTIVE" | "INACTIVE";
};

const emptyProduct: ProductPayload = {
  name: "",
  unit: "kg",
  status: "ACTIVE"
};

export function ProductManager({
  products,
  pagination,
  query
}: {
  products: ProductRow[];
  pagination: PageMeta;
  query: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function openCreate() {
    setEditing(null);
    setError("");
    setOpen(true);
  }

  function openEdit(product: ProductRow) {
    setEditing(product);
    setError("");
    setOpen(true);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload: ProductPayload = {
      name: String(form.get("name") ?? ""),
      unit: String(form.get("unit") ?? "kg"),
      status: String(form.get("status") ?? "ACTIVE") as ProductPayload["status"]
    };

    startTransition(() => {
      void (async () => {
        const result = editing ? await updateProduct(editing.id, payload) : await createProduct(payload);
        if (!result.ok) {
          setError(result.error ?? "Unable to save product.");
          return;
        }
        setOpen(false);
        router.refresh();
      })();
    });
  }

  function handleDelete(product: ProductRow) {
    if (!window.confirm(`Delete ${product.name}? Existing transactions will mark it inactive instead.`)) {
      return;
    }
    startTransition(() => {
      void (async () => {
        await deleteProduct(product.id);
        router.refresh();
      })();
    });
  }

  const formDefaults = editing ?? emptyProduct;

  return (
    <div className="space-y-4">
      <MasterListToolbar query={query} placeholder="Search fish or unit">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate} size="lg">
              <Plus className="h-5 w-5" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Product" : "New Product"}</DialogTitle>
              <DialogDescription>Fish and seafood names used in purchase and sale items.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" defaultValue={formDefaults.name} required />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="unit">Unit</Label>
                  <Input id="unit" name="unit" defaultValue={formDefaults.unit ?? "kg"} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <SelectNative id="status" name="status" defaultValue={formDefaults.status ?? "ACTIVE"}>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </SelectNative>
                </div>
              </div>
              {error ? <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
              <Button className="w-full" size="lg" disabled={pending}>
                {pending ? "Saving..." : "Save Product"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </MasterListToolbar>

      {products.length ? (
        <>
          <div className="hidden overflow-hidden rounded-md border md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/60 text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Unit</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-b last:border-b-0">
                    <td className="px-4 py-3 font-medium">{product.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{product.unit}</td>
                    <td className="px-4 py-3">
                      <Badge variant={product.status === "ACTIVE" ? "secondary" : "outline"}>{product.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button type="button" variant="ghost" size="icon" aria-label="Edit product" onClick={() => openEdit(product)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" aria-label="Delete product" onClick={() => handleDelete(product)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {products.map((product) => (
              <Card key={product.id}>
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold">{product.name}</h2>
                      <Badge variant={product.status === "ACTIVE" ? "secondary" : "outline"}>{product.status}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">Unit: {product.unit}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button type="button" variant="ghost" size="icon" aria-label="Edit product" onClick={() => openEdit(product)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" aria-label="Delete product" onClick={() => handleDelete(product)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">No products found.</CardContent>
        </Card>
      )}

      <PaginationControls meta={pagination} />
    </div>
  );
}