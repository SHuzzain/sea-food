"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Edit2, Plus, Search, Trash2 } from "lucide-react";
import { createCustomer, deleteCustomer, updateCustomer, type CustomerPayload } from "@/app/(app)/customers/actions";
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
import { Textarea } from "@/components/ui/textarea";
import { formatRupee } from "@/lib/utils";

export type CustomerRow = {
  id: string;
  name: string;
  mobile: string;
  address: string;
  openingBalance: number;
  outstandingBalance: number;
  status: "ACTIVE" | "INACTIVE";
};

const emptyCustomer: CustomerPayload = {
  name: "",
  mobile: "",
  address: "",
  openingBalance: 0,
  outstandingBalance: 0,
  status: "ACTIVE"
};

export function CustomerManager({ customers }: { customers: CustomerRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerRow | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return customers;
    }
    return customers.filter((customer) =>
      [customer.name, customer.mobile, customer.address].join(" ").toLowerCase().includes(needle)
    );
  }, [customers, query]);

  function openCreate() {
    setEditing(null);
    setError("");
    setOpen(true);
  }

  function openEdit(customer: CustomerRow) {
    setEditing(customer);
    setError("");
    setOpen(true);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload: CustomerPayload = {
      name: String(form.get("name") ?? ""),
      mobile: String(form.get("mobile") ?? ""),
      address: String(form.get("address") ?? ""),
      openingBalance: Number(form.get("openingBalance") ?? 0),
      outstandingBalance: Number(form.get("outstandingBalance") ?? 0),
      status: String(form.get("status") ?? "ACTIVE") as CustomerPayload["status"]
    };

    startTransition(() => {
      void (async () => {
        const result = editing ? await updateCustomer(editing.id, payload) : await createCustomer(payload);
        if (!result.ok) {
          setError(result.error ?? "Unable to save customer.");
          return;
        }
        setOpen(false);
        router.refresh();
      })();
    });
  }

  function handleDelete(customer: CustomerRow) {
    if (!window.confirm(`Delete ${customer.name}? Existing transactions will mark it inactive instead.`)) {
      return;
    }
    startTransition(() => {
      void (async () => {
        await deleteCustomer(customer.id);
        router.refresh();
      })();
    });
  }

  const formDefaults = editing ?? emptyCustomer;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search customer or mobile"
            className="pl-10"
          />
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate} size="lg">
              <Plus className="h-5 w-5" />
              Customer
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Customer" : "New Customer"}</DialogTitle>
              <DialogDescription>Keep customer balance and contact details ready for billing.</DialogDescription>
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
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="openingBalance">Opening Balance</Label>
                  <Input
                    id="openingBalance"
                    name="openingBalance"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={formDefaults.openingBalance ?? 0}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="outstandingBalance">Outstanding Balance</Label>
                  <Input
                    id="outstandingBalance"
                    name="outstandingBalance"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={formDefaults.outstandingBalance ?? formDefaults.openingBalance ?? 0}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
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
                {pending ? "Saving..." : "Save Customer"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {filtered.map((customer) => (
          <Card key={customer.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">{customer.name}</h2>
                    <Badge variant={customer.status === "ACTIVE" ? "secondary" : "outline"}>{customer.status}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{customer.mobile || "No mobile"}</p>
                  {customer.address ? <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{customer.address}</p> : null}
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button type="button" variant="ghost" size="icon" aria-label="Edit customer" onClick={() => openEdit(customer)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Delete customer"
                    onClick={() => handleDelete(customer)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-md bg-muted p-3">
                  <p className="text-muted-foreground">Opening</p>
                  <p className="font-semibold">{formatRupee(customer.openingBalance)}</p>
                </div>
                <div className="rounded-md bg-muted p-3">
                  <p className="text-muted-foreground">Outstanding</p>
                  <p className="font-semibold">{formatRupee(customer.outstandingBalance)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
