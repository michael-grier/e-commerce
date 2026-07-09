import type { CartDisplayLine, CheckoutRequest } from "./types";

export function getCartItemCount(lines: CartDisplayLine[]): number {
  return lines.reduce((total, line) => total + line.quantity, 0);
}

export function getCartSubtotalCents(lines: CartDisplayLine[]): number {
  return lines.reduce((total, line) => total + line.priceCents * line.quantity, 0);
}

export function toCheckoutRequest(lines: CartDisplayLine[]): CheckoutRequest {
  return {
    items: lines.map(({ variantId, quantity }) => ({
      variantId,
      quantity,
    })),
  };
}
