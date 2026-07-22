import "server-only";

import { and, eq, gte, isNull, sql } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import { orderItems, orders, pendingCheckouts, productVariants } from "@/lib/db/schema";
import {
  assertInventoryDecremented,
  assertPendingCheckoutItemsMatchSnapshots,
  PaidOrderError,
  type PaidOrderWriter,
  parsePendingCheckoutLineSnapshots,
  resolveOrderItemSnapshots,
} from "@/lib/orders/create-paid-order";
import { makeOrderNumber } from "@/lib/orders/order-number";

export const paidOrderRepository: PaidOrderWriter = {
  async createPaidOrder(checkout) {
    return getDb().transaction(async (tx) => {
      const existingOrder = await tx.query.orders.findFirst({
        columns: { id: true },
        where: (orders, { eq }) => eq(orders.stripeSessionId, checkout.stripeSessionId),
      });

      if (existingOrder) {
        return { created: false, orderId: existingOrder.id };
      }

      const pendingCheckout = await tx.query.pendingCheckouts.findFirst({
        where: (pendingCheckouts, { eq }) =>
          eq(pendingCheckouts.token, checkout.pendingCheckoutToken),
      });

      if (!pendingCheckout) {
        throw new PaidOrderError("Pending checkout was not found.");
      }

      if (pendingCheckout.stripeSessionId !== checkout.stripeSessionId) {
        throw new PaidOrderError("Pending checkout does not match the Stripe Session.");
      }

      if (pendingCheckout.completedAt) {
        throw new PaidOrderError("Pending checkout is completed without a matching order.");
      }

      const lineSnapshots = parsePendingCheckoutLineSnapshots(pendingCheckout.lineItems);
      assertPendingCheckoutItemsMatchSnapshots(pendingCheckout.items, lineSnapshots);
      const snapshots = resolveOrderItemSnapshots(lineSnapshots, checkout);
      const [order] = await tx
        .insert(orders)
        .values({
          orderNumber: makeOrderNumber(),
          email: checkout.email,
          status: "paid",
          stripeSessionId: checkout.stripeSessionId,
          stripePaymentIntentId: checkout.stripePaymentIntentId,
          subtotalCents: checkout.subtotalCents,
          taxCents: checkout.taxCents,
          shippingCents: checkout.shippingCents,
          totalCents: checkout.totalCents,
          currency: checkout.currency,
          shippingAddress: checkout.shippingAddress,
        })
        .onConflictDoNothing({ target: orders.stripeSessionId })
        .returning({ id: orders.id });

      if (!order) {
        const concurrentOrder = await tx.query.orders.findFirst({
          columns: { id: true },
          where: (orders, { eq }) => eq(orders.stripeSessionId, checkout.stripeSessionId),
        });

        if (!concurrentOrder) {
          throw new PaidOrderError("Unable to resolve the existing Stripe Session order.");
        }

        return { created: false, orderId: concurrentOrder.id };
      }

      for (const snapshot of snapshots) {
        const updatedVariants = await tx
          .update(productVariants)
          .set({
            inventoryQty: sql`${productVariants.inventoryQty} - ${snapshot.quantity}`,
          })
          .where(
            and(
              eq(productVariants.id, snapshot.variantId),
              gte(productVariants.inventoryQty, snapshot.quantity),
            ),
          )
          .returning({ id: productVariants.id });

        assertInventoryDecremented(
          updatedVariants.map((variant) => variant.id),
          snapshot,
        );
      }

      await tx.insert(orderItems).values(
        snapshots.map((snapshot) => ({
          orderId: order.id,
          ...snapshot,
        })),
      );

      const completedCheckouts = await tx
        .update(pendingCheckouts)
        .set({ completedAt: new Date() })
        .where(
          and(eq(pendingCheckouts.id, pendingCheckout.id), isNull(pendingCheckouts.completedAt)),
        )
        .returning({ id: pendingCheckouts.id });

      if (completedCheckouts.length !== 1) {
        throw new PaidOrderError("Pending checkout could not be marked completed.");
      }

      return { created: true, orderId: order.id };
    });
  },
};
