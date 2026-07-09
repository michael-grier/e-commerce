import { ArrowRight, Search, ShoppingCart } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const featuredProducts = [
  {
    name: "Street Deck 8.25",
    category: "Decks",
    price: "$89.00",
    color: "bg-neutral-100",
  },
  {
    name: "Canvas Coach Jacket",
    category: "Apparel",
    price: "$128.00",
    color: "bg-stone-100",
  },
  {
    name: "Precision Bearings",
    category: "Accessories",
    price: "$34.00",
    color: "bg-zinc-100",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <header className="border-b bg-neutral-950 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-5">
          <Link href="/" className="font-black text-2xl tracking-normal">
            Skate Shop
          </Link>
          <nav className="hidden items-center gap-6 font-semibold text-sm md:flex">
            <Link className="text-white/80 transition hover:text-white" href="/products">
              Decks
            </Link>
            <Link className="text-white/80 transition hover:text-white" href="/products">
              Apparel
            </Link>
            <Link className="text-white/80 transition hover:text-white" href="/products">
              Accessories
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <Button className="text-white hover:bg-white/10" size="icon" variant="ghost">
              <Search aria-hidden="true" />
              <span className="sr-only">Search</span>
            </Button>
            <Button className="text-white hover:bg-white/10" size="icon" variant="ghost">
              <ShoppingCart aria-hidden="true" />
              <span className="sr-only">Cart</span>
            </Button>
          </div>
        </div>
      </header>

      <section className="border-b bg-neutral-950 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-10 md:grid-cols-[0.9fr_1.1fr] md:items-end md:py-16">
          <div className="space-y-6">
            <Badge className="bg-accent text-accent-foreground" variant="secondary">
              Free shipping threshold ready
            </Badge>
            <div className="space-y-4">
              <h1 className="max-w-2xl font-black text-5xl tracking-normal md:text-7xl">
                Built for daily skate goods.
              </h1>
              <p className="max-w-xl text-lg text-white/70">
                A lean catalog, guest checkout, and admin-managed inventory backed by Postgres and
                Stripe.
              </p>
            </div>
            <Button asChild className="bg-white text-neutral-950 hover:bg-white/90" size="lg">
              <Link href="/products">
                Shop products
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {featuredProducts.map((product) => (
              <div className="min-w-0 space-y-3" key={product.name}>
                <div
                  className={`${product.color} aspect-[4/5] rounded-lg border border-white/10`}
                />
                <div className="space-y-1">
                  <p className="truncate font-black text-lg">{product.name}</p>
                  <p className="text-white/60 text-sm">{product.category}</p>
                  <p className="font-bold">{product.price}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-10 md:grid-cols-3">
        {[
          "Server-authoritative pricing",
          "Webhook-born paid orders",
          "Direct R2 image uploads",
        ].map((label) => (
          <div className="border-t pt-4" key={label}>
            <h2 className="font-black text-2xl">{label}</h2>
            <p className="mt-2 text-muted-foreground">
              The implementation follows the architecture plan and keeps critical boundaries on the
              server.
            </p>
          </div>
        ))}
      </section>
    </main>
  );
}
