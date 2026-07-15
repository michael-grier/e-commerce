import { ClerkProvider, UserButton } from "@clerk/nextjs";
import type { Metadata, Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/require-admin";

export const metadata: Metadata = {
  title: "Admin",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  await requireAdmin();

  return (
    <ClerkProvider dynamic>
      <div className="min-h-screen bg-muted/40">
        <header className="border-b bg-background">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
            <Link className="font-black text-xl tracking-normal" href={"/admin" as Route}>
              Skate Shop Admin
            </Link>
            <div className="flex items-center gap-3">
              <Button asChild size="sm" variant="outline">
                <Link href="/">View storefront</Link>
              </Button>
              <UserButton />
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl px-6 py-10">{children}</main>
      </div>
    </ClerkProvider>
  );
}
