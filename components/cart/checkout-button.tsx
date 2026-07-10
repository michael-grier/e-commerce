"use client";

import { ArrowRight, LoaderCircle } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useCartStore } from "@/lib/cart/store";
import { checkoutErrorResponseSchema, checkoutResponseSchema } from "@/lib/validators/cart";

export function CheckoutButton() {
  const lines = useCartStore((state) => state.lines);
  const toCheckoutRequest = useCartStore((state) => state.toCheckoutRequest);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleCheckout() {
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(toCheckoutRequest()),
      });
      const responseBody: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const parsedError = checkoutErrorResponseSchema.safeParse(responseBody);
        throw new Error(
          parsedError.success ? parsedError.data.error : "Unable to start checkout. Try again.",
        );
      }

      const parsedResponse = checkoutResponseSchema.safeParse(responseBody);

      if (!parsedResponse.success) {
        throw new Error("Checkout returned an invalid response. Try again.");
      }

      window.location.assign(parsedResponse.data.url);
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Unable to start checkout. Try again.",
      );
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <Button
        className="w-full"
        disabled={lines.length === 0 || isLoading}
        onClick={handleCheckout}
        size="lg"
        type="button"
      >
        {isLoading ? (
          <>
            <LoaderCircle aria-hidden="true" className="animate-spin" />
            Redirecting…
          </>
        ) : (
          <>
            Checkout
            <ArrowRight aria-hidden="true" />
          </>
        )}
      </Button>
      {error ? (
        <p aria-live="polite" className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
