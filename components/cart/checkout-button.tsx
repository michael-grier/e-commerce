"use client";

import { ArrowRight } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useCartStore } from "@/lib/cart/store";

export function CheckoutButton() {
  const lines = useCartStore((state) => state.lines);
  const toCheckoutRequest = useCartStore((state) => state.toCheckoutRequest);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <Button
        className="w-full"
        disabled={lines.length === 0}
        onClick={() => {
          const payload = toCheckoutRequest();

          setError(
            `Checkout will post ${payload.items.length} item line${
              payload.items.length === 1 ? "" : "s"
            } after the Stripe route is implemented.`,
          );
        }}
        size="lg"
        type="button"
      >
        Checkout
        <ArrowRight aria-hidden="true" />
      </Button>
      {error ? <p className="text-muted-foreground text-sm">{error}</p> : null}
    </div>
  );
}
