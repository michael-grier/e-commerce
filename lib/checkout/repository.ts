import "server-only";

import { eq, inArray } from "drizzle-orm";

import type { CheckoutRepository } from "@/lib/checkout/create-hosted-checkout";
import { getDb } from "@/lib/db/client";
import { pendingCheckouts, products, productVariants } from "@/lib/db/schema";

export const checkoutRepository: CheckoutRepository = {
  async findVariants(variantIds) {
    return getDb()
      .select({
        id: productVariants.id,
        productName: products.name,
        productStatus: products.status,
        variantName: productVariants.name,
        priceCents: productVariants.priceCents,
        inventoryQty: productVariants.inventoryQty,
      })
      .from(productVariants)
      .innerJoin(products, eq(products.id, productVariants.productId))
      .where(inArray(productVariants.id, variantIds));
  },
  async createPendingCheckout(checkout) {
    await getDb().insert(pendingCheckouts).values(checkout);
  },
  async setStripeSessionId(token, stripeSessionId) {
    await getDb()
      .update(pendingCheckouts)
      .set({ stripeSessionId })
      .where(eq(pendingCheckouts.token, token));
  },
};
