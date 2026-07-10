import type { CartLine } from "@/lib/validators/cart";

export type PaidCheckoutData = {
  pendingCheckoutToken: string;
  stripeSessionId: string;
  stripePaymentIntentId: string | null;
  email: string;
  subtotalCents: number;
  taxCents: number;
  shippingCents: number;
  totalCents: number;
  currency: string;
  shippingAddress: Record<string, unknown> | null;
};

export type OrderSnapshotVariant = {
  id: string;
  productName: string;
  variantName: string;
  priceCents: number;
};

export type OrderItemSnapshot = {
  variantId: string;
  productNameSnapshot: string;
  variantNameSnapshot: string;
  unitPriceCentsSnapshot: number;
  quantity: number;
};

export type CreatePaidOrderResult = {
  created: boolean;
  orderId: string;
};

export type PaidOrderWriter = {
  createPaidOrder: (checkout: PaidCheckoutData) => Promise<CreatePaidOrderResult>;
};

export class PaidOrderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaidOrderError";
  }
}

export class InventoryUnavailableError extends PaidOrderError {
  constructor(variantId: string, quantity: number) {
    super(`Inventory is no longer available for variant ${variantId} at quantity ${quantity}.`);
    this.name = "InventoryUnavailableError";
  }
}

export function resolveOrderItemSnapshots(
  cartLines: CartLine[],
  variants: OrderSnapshotVariant[],
): OrderItemSnapshot[] {
  const variantsById = new Map(variants.map((variant) => [variant.id, variant]));

  return cartLines.map((line) => {
    const variant = variantsById.get(line.variantId);

    if (!variant) {
      throw new PaidOrderError(`Variant ${line.variantId} is unavailable for order snapshotting.`);
    }

    return {
      variantId: variant.id,
      productNameSnapshot: variant.productName,
      variantNameSnapshot: variant.variantName,
      unitPriceCentsSnapshot: variant.priceCents,
      quantity: line.quantity,
    };
  });
}

export function assertInventoryDecremented(
  updatedVariantIds: string[],
  line: Pick<OrderItemSnapshot, "variantId" | "quantity">,
): void {
  if (updatedVariantIds.length !== 1 || updatedVariantIds[0] !== line.variantId) {
    throw new InventoryUnavailableError(line.variantId, line.quantity);
  }
}
