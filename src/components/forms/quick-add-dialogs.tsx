"use client";

import { FormEvent, useState, useTransition } from "react";
import { createCustomer } from "@/app/(app)/customers/actions";
import { createProduct } from "@/app/(app)/products/actions";
import { createSupplier } from "@/app/(app)/suppliers/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { SelectOption } from "@/lib/options";

type QuickAddProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (option: SelectOption) => void;
};

export function QuickAddCustomerDialog({ open, onOpenChange, onCreated }: QuickAddProps) {
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(() => {
      void (async () => {
        const result = await createCustomer({
          name: String(form.get("name") ?? ""),
          mobile: String(form.get("mobile") ?? ""),
          address: String(form.get("address") ?? ""),
          openingBalance: Number(form.get("openingBalance") ?? 0),
          outstandingBalance: Number(form.get("outstandingBalance") ?? form.get("openingBalance") ?? 0),
          status: "ACTIVE"
        });
        if (!result.ok || !result.customer) {
          setError(result.error ?? "Unable to add customer.");
          return;
        }
        onCreated(result.customer);
        onOpenChange(false);
        setError("");
      })();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Quick Add Customer</DialogTitle>
          <DialogDescription>Add the customer without leaving this entry.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="quick-customer-name">Name</Label>
            <Input id="quick-customer-name" name="name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quick-customer-mobile">Mobile</Label>
            <Input id="quick-customer-mobile" name="mobile" inputMode="tel" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quick-customer-address">Address</Label>
            <Textarea id="quick-customer-address" name="address" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="quick-customer-opening">Opening Balance</Label>
              <Input id="quick-customer-opening" name="openingBalance" type="number" min="0" step="0.01" defaultValue="0" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quick-customer-outstanding">Outstanding Balance</Label>
              <Input id="quick-customer-outstanding" name="outstandingBalance" type="number" min="0" step="0.01" defaultValue="0" />
            </div>
          </div>
          {error ? <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
          <Button className="w-full" size="lg" disabled={pending}>
            {pending ? "Adding..." : "Add Customer"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function QuickAddSupplierDialog({ open, onOpenChange, onCreated }: QuickAddProps) {
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(() => {
      void (async () => {
        const result = await createSupplier({
          name: String(form.get("name") ?? ""),
          mobile: String(form.get("mobile") ?? ""),
          address: String(form.get("address") ?? ""),
          status: "ACTIVE"
        });
        if (!result.ok || !result.supplier) {
          setError(result.error ?? "Unable to add supplier.");
          return;
        }
        onCreated(result.supplier);
        onOpenChange(false);
        setError("");
      })();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Quick Add Supplier</DialogTitle>
          <DialogDescription>Add the supplier without leaving this purchase.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="quick-supplier-name">Name</Label>
            <Input id="quick-supplier-name" name="name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quick-supplier-mobile">Mobile</Label>
            <Input id="quick-supplier-mobile" name="mobile" inputMode="tel" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quick-supplier-address">Address</Label>
            <Textarea id="quick-supplier-address" name="address" />
          </div>
          {error ? <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
          <Button className="w-full" size="lg" disabled={pending}>
            {pending ? "Adding..." : "Add Supplier"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function QuickAddProductDialog({ open, onOpenChange, onCreated }: QuickAddProps) {
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(() => {
      void (async () => {
        const result = await createProduct({
          name: String(form.get("name") ?? ""),
          unit: String(form.get("unit") ?? "kg"),
          status: "ACTIVE"
        });
        if (!result.ok || !result.product) {
          setError(result.error ?? "Unable to add product.");
          return;
        }
        onCreated(result.product);
        onOpenChange(false);
        setError("");
      })();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Quick Add Product</DialogTitle>
          <DialogDescription>Add a fish or seafood item without leaving this entry.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="quick-product-name">Name</Label>
            <Input id="quick-product-name" name="name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quick-product-unit">Unit</Label>
            <Input id="quick-product-unit" name="unit" defaultValue="kg" required />
          </div>
          {error ? <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
          <Button className="w-full" size="lg" disabled={pending}>
            {pending ? "Adding..." : "Add Product"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
