"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CreditCard,
  FileText,
  Fish,
  Home,
  LogOut,
  Menu,
  Plus,
  ReceiptIndianRupee,
  ShoppingBag,
  Truck,
  Users
} from "lucide-react";
import { logoutAction } from "@/app/(app)/actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const logoSrc = "/brand/arf-seafoods-logo.jpeg";

type User = {
  id: string;
  name: string;
  email: string;
};

const mobileLinks = [
  { href: "/", label: "Home", icon: Home },
  { href: "/purchase", label: "Purchase", icon: ShoppingBag },
  { href: "/sale", label: "Sale", icon: ReceiptIndianRupee },
  { href: "/payment", label: "Payment", icon: CreditCard },
  { href: "/reports", label: "Reports", icon: BarChart3 }
];

const desktopLinks = [
  ...mobileLinks,
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/suppliers", label: "Suppliers", icon: Truck },
  { href: "/products", label: "Products", icon: Fish }
];

function isActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname.startsWith(href);
}

function NewMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          className="fixed bottom-20 right-4 z-40 h-14 w-14 rounded-full shadow-soft lg:bottom-6 lg:right-8"
          aria-label="Create new entry"
        >
          <Plus className="h-7 w-7" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={12}>
        <DropdownMenuItem asChild>
          <Link href="/purchase" className="gap-2">
            <ShoppingBag className="h-4 w-4" />
            New Purchase
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/sale" className="gap-2">
            <FileText className="h-4 w-4" />
            New Sale
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/payment" className="gap-2">
            <CreditCard className="h-4 w-4" />
            New Payment
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({ user, children }: { user: User; children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-dvh bg-background lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="hidden border-r bg-card lg:block">
        <div className="sticky top-0 flex h-dvh flex-col">
          <div className="flex h-20 items-center gap-3 border-b px-5">
            <Image src={logoSrc} alt="ARF Seafoods logo" width={44} height={44} className="h-11 w-11 rounded-md object-cover" />
            <div>
              <p className="font-semibold">ARF Seafoods</p>
              <p className="text-xs text-muted-foreground">Purchase and sales</p>
            </div>
          </div>
          <nav className="flex-1 space-y-1 p-3">
            {desktopLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                    isActive(pathname, item.href) && "bg-accent text-accent-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="border-t p-3">
            <div className="mb-3 rounded-md bg-muted p-3">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="break-all text-xs text-muted-foreground">{user.email}</p>
            </div>
            <form action={logoutAction}>
              <Button type="submit" variant="outline" className="w-full justify-start">
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </form>
          </div>
        </div>
      </aside>

      <div className="flex min-h-dvh flex-col">
        <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur lg:hidden">
          <div className="flex h-16 items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <Image src={logoSrc} alt="ARF Seafoods logo" width={40} height={40} className="h-10 w-10 rounded-md object-cover" />
              <div>
                <p className="text-sm font-semibold">ARF Seafoods</p>
                <p className="text-xs text-muted-foreground">{user.name}</p>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href="/customers">Customers</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/suppliers">Suppliers</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/products">Products</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <form action={logoutAction} className="w-full">
                    <button type="submit" className="w-full text-left">
                      Logout
                    </button>
                  </form>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 pb-28 lg:pb-10">{children}</main>
        <NewMenu />

        <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-card pb-[env(safe-area-inset-bottom)] lg:hidden">
          <div className="grid h-16 grid-cols-5">
            {mobileLinks.map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground",
                    active && "text-primary"
                  )}
                >
                  <Icon className={cn("h-5 w-5", active && "stroke-[2.5]")} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
