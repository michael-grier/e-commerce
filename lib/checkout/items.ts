import type Stripe from "stripe";

import type { CartLine } from "@/lib/validators/cart";

import { CheckoutError } from "./errors";

export type CheckoutVariantRecord = {
  id: string;
  productName: string;
  productStatus: "draft" | "active" | "archived";
  variantName: string;
  priceCents: number;
  inventoryQty: number;
};

export type ResolvedCheckoutLine = CheckoutVariantRecord & {
  quantity: number;
};

export function combineCartLines(lines: CartLine[]): CartLine[] {
  const quantities = new Map<string, number>();

  for (const line of lines) {
    quantities.set(line.variantId, (quantities.get(line.variantId) ?? 0) + line.quantity);
  }

  return Array.from(quantities, ([variantId, quantity]) => ({ variantId, quantity }));
}

export function resolveCheckoutLines(
  cartLines: CartLine[],
  variants: CheckoutVariantRecord[],
): ResolvedCheckoutLine[] {
  const combinedLines = combineCartLines(cartLines);
  const variantsById = new Map(variants.map((variant) => [variant.id, variant]));

  return combinedLines.map((line) => {
    const variant = variantsById.get(line.variantId);

    if (variant?.productStatus !== "active") {
      throw new CheckoutError("One or more items are no longer available.", 404);
    }

    if (variant.inventoryQty < line.quantity) {
      throw new CheckoutError(
        `${variant.productName} (${variant.variantName}) only has ${variant.inventoryQty} available.`,
        409,
      );
    }

    return {
      ...variant,
      quantity: line.quantity,
    };
  });
}

export function buildStripeLineItems(
  lines: ResolvedCheckoutLine[],
): Stripe.Checkout.SessionCreateParams.LineItem[] {
  return lines.map((line) => ({
    quantity: line.quantity,
    price_data: {
      currency: "cad",
      unit_amount: line.priceCents,
      tax_behavior: "exclusive",
      product_data: {
        name: line.productName,
        description: line.variantName,
      },
    },
  }));
}

export function getCheckoutSubtotalCents(lines: ResolvedCheckoutLine[]): number {
  return lines.reduce((subtotal, line) => subtotal + line.priceCents * line.quantity, 0);
}
