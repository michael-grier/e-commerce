"use client";

import { useEffect, useState } from "react";

import { cartStockResponseSchema } from "./stock";

/** Rechecks saved cart lines on mount and when the shopper returns to the tab. */
export function useCartStock(variantId: string) {
  const [availableQty, setAvailableQty] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let controller: AbortController;
    async function refresh() {
      controller?.abort();
      controller = new AbortController();
      const signal = controller.signal;
      try {
        const response = await fetch(`/api/cart/stock?variantId=${encodeURIComponent(variantId)}`, {
          cache: "no-store",
          signal,
        });
        if (!response.ok) throw new Error("Stock lookup failed");
        const stock = cartStockResponseSchema.parse(await response.json());
        if (!signal.aborted) {
          setAvailableQty(stock.availableQty);
          setFailed(false);
        }
      } catch {
        if (!signal.aborted) setFailed(true);
      }
    }
    void refresh();
    window.addEventListener("focus", refresh);
    return () => {
      controller.abort();
      window.removeEventListener("focus", refresh);
    };
  }, [variantId]);

  return { availableQty, failed };
}
