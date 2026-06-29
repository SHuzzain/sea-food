"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Edit2, Plus, Trash2 } from "lucide-react";
import { createSupplier, deleteSupplier, updateSupplier, type SupplierPayload } from "@/app/(app)/suppliers/actions";
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
import { Textarea } from "@/components/ui/textarea";
import type { PageMeta } from "@/lib/pagination";

export type SupplierRow = {
  id: string;
  name: string;
  mobile: string;
  address: string;
  status: "ACTIVE" | "INACTIVE";
};

const emptySupplier: SupplierPayload = {
  name: "",
  mobile: "",
  address: "",
  status: "ACTIVE"
};

export function SupplierManager({
  suppliers,
  pagination,
  query
}: {
  suppliers: SupplierRow[];
  pagination: PageMeta;
  query: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SupplierRow | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function openCreate() {
    setEditing(null);
    setError("");
    setOpen(true);
  }

  function openEdit(supplier: SupplierRow) {
    setEditing(supplier);
    setError("");
    setOpen(true);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload: SupplierPayload = {
      name: String(form.get("name") ?? ""),
      mobile: String(form.get("mobile") ?? ""),
      address: String(form.get("address") ?? ""),
      status: String(form.get("status") ?? "ACTIVE") as SupplierPayload["status"]
    };

    startTransition(() => {
      void (async () => {
        const result = editing ? await updateSupplier(editing.id, payload) : await createSupplier(payload);
        if (!result.ok) {
          setError(result.error ?? "Unable to save supplier.");
          return;
        }
        setOpen(false);
        router.refresh();
      })();
    });
  }

  function handleDelete(supplier: SupplierRow) {
    if (!window.confirm(`Delete ${supplier.name}? Existing transactions will mark it inactive instead.`)) {
      return;
    }
    startTransition(() => {
      void (async () => {
        await deleteSupplier(supplier.id);
        router.refresh();
      })();
    });
  }

  const formDefaults = editing ?? emptySupplier;

  return (
    <div className="space-y-4">
      <MasterListToolbar query={query} placeholder="Search supplier or mobile">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate} size="lg">
              <Plus className="h-5 w-5" />
              Add Supplier
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Supplier" : "New Supplier"}</DialogTitle>
              <DialogDescription>Supplier details are used while entering purchases.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" defaultValue={formDefaults.name} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mobile">Mobile</Label>
                <Input id="mobile" name="mobile" inputMode="tel" defaultValue={formDefaults.mobile ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea id="address" name="address" defaultValue={formDefaults.address ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <SelectNative id="status" name="status" defaultValue={formDefaults.status ?? "ACTIVE"}>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </SelectNative>
              </div>
              {error ? <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
              <Button className="w-full" size="lg" disabled={pending}>
                {pending ? "Saving..." : "Save Supplier"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </MasterListToolbar>

      {suppliers.length ? (
        <>
          <div className="hidden overflow-hidden rounded-md border md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/60 text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Mobile</th>
                  <th className="px-4 py-3 font-medium">Address</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((supplier) => (
                  <tr key={supplier.id} className="border-b last:border-b-0">
                    <td className="px-4 py-3 font-medium">{supplier.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{supplier.mobile || "—"}</td>
                    <td className="max-w-[280px] truncate px-4 py-3 text-muted-foreground" title={supplier.address}>
                      {supplier.address || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={supplier.status === "ACTIVE" ? "secondary" : "outline"}>{supplier.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button type="button" variant="ghost" size="icon" aria-label="Edit supplier" onClick={() => openEdit(supplier)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" aria-label="Delete supplier" onClick={() => handleDelete(supplier)}>
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
            {suppliers.map((supplier) => (
              <Card key={supplier.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-semibold">{supplier.name}</h2>
                        <Badge variant={supplier.status === "ACTIVE" ? "secondary" : "outline"}>{supplier.status}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{supplier.mobile || "No mobile"}</p>
                      {supplier.address ? <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{supplier.address}</p> : null}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button type="button" variant="ghost" size="icon" aria-label="Edit supplier" onClick={() => openEdit(supplier)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" aria-label="Delete supplier" onClick={() => handleDelete(supplier)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">No suppliers found.</CardContent>
        </Card>
      )}

      <PaginationControls meta={pagination} />
    </div>
  );
}