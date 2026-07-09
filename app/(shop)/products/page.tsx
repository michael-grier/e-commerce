import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function ProductsPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-6 py-10">
      <header className="space-y-3 border-b pb-8">
        <p className="font-semibold text-muted-foreground text-sm uppercase tracking-wide">
          Catalog
        </p>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <h1 className="font-black text-5xl tracking-normal">Products</h1>
            <p className="max-w-2xl text-muted-foreground">
              The database-backed catalog lands in the next implementation checkpoint.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </header>
      <section className="grid gap-6 md:grid-cols-3">
        {["Decks", "Apparel", "Accessories"].map((category) => (
          <div className="space-y-3 border-t pt-4" key={category}>
            <div className="aspect-[4/3] rounded-lg bg-muted" />
            <h2 className="font-black text-2xl">{category}</h2>
            <p className="text-muted-foreground">
              Placeholder category surface ready for Drizzle data.
            </p>
          </div>
        ))}
      </section>
    </main>
  );
}
