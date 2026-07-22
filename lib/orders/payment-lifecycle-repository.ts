import "server-only";

import { eq, sql } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import { orders, stripePaymentEvents } from "@/lib/db/schema";
import {
  derivePaymentLifecycleState,
  type PaymentLifecycleUpdate,
  type PaymentLifecycleWriter,
} from "@/lib/orders/payment-lifecycle";

export const paymentLifecycleRepository: PaymentLifecycleWriter = {
  async recordPaymentLifecycleUpdate(update) {
    return getDb().transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext(${update.stripePaymentIntentId}))`,
      );

      const insertedEvents = await tx
        .insert(stripePaymentEvents)
        .values(update)
        .onConflictDoNothing({ target: stripePaymentEvents.stripeEventId })
        .returning({ stripeEventId: stripePaymentEvents.stripeEventId });
      const order = await tx.query.orders.findFirst({
        where: (orders, { eq }) => eq(orders.stripePaymentIntentId, update.stripePaymentIntentId),
      });

      if (!order) {
        return { changed: insertedEvents.length === 1, orderId: null };
      }

      const events = await tx
        .select()
        .from(stripePaymentEvents)
        .where(eq(stripePaymentEvents.stripePaymentIntentId, update.stripePaymentIntentId));
      const state = derivePaymentLifecycleState(
        order.totalCents,
        order.currency,
        events.map(toPaymentLifecycleUpdate),
      );
      const nextOrderStatus =
        state.refundStatus === "full" && order.status === "paid" ? "refunded" : order.status;
      const stateChanged =
        order.status !== nextOrderStatus ||
        order.refundStatus !== state.refundStatus ||
        order.refundedCents !== state.refundedCents ||
        order.disputeStatus !== state.disputeStatus;

      if (stateChanged) {
        await tx
          .update(orders)
          .set({
            status: nextOrderStatus,
            refundStatus: state.refundStatus,
            refundedCents: state.refundedCents,
            disputeStatus: state.disputeStatus,
          })
          .where(eq(orders.id, order.id));
      }

      return {
        changed: insertedEvents.length === 1 || stateChanged,
        orderId: order.id,
      };
    });
  },
};

function toPaymentLifecycleUpdate(
  event: typeof stripePaymentEvents.$inferSelect,
): PaymentLifecycleUpdate {
  return {
    stripeEventId: event.stripeEventId,
    stripePaymentIntentId: event.stripePaymentIntentId,
    kind: event.kind,
    refundedCents: event.refundedCents,
    currency: event.currency,
    disputeStatus: event.disputeStatus === "none" ? null : event.disputeStatus,
    occurredAt: event.occurredAt,
  };
}
