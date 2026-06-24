"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Edit2, Plus, Search, Trash2 } from "lucide-react";
import { createProduct, deleteProduct, updateProduct, type ProductPayload } from "@/app/(app)/products/actions";
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
import { SelectNative } from "@/components/ui/select-native";

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

export function ProductManager({ products }: { products: ProductRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return products;
    }
    return products.filter((product) => [product.name, product.unit].join(" ").toLowerCase().includes(needle));
  }, [products, query]);

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search fish or unit" className="pl-10" />
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate} size="lg">
              <Plus className="h-5 w-5" />
              Product
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
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((product) => (
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
    </div>
  );
}
