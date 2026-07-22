import type { Order } from "@/lib/db/schema";
import { isOrderFulfillmentEligible } from "@/lib/orders/payment-lifecycle";

export type OrderFulfillmentState = Pick<
  Order,
  "status" | "inventoryStatus" | "refundStatus" | "disputeStatus"
>;

export type OrderFulfillmentRepository = {
  markPaidOrderFulfilled: (orderId: string) => Promise<boolean>;
  findOrderFulfillmentState: (orderId: string) => Promise<OrderFulfillmentState | null>;
};

export class OrderFulfillmentError extends Error {
  constructor(
    message: string,
    readonly code: "not_found" | "invalid_status",
  ) {
    super(message);
    this.name = "OrderFulfillmentError";
  }
}

export async function markOrderShipped(
  orderId: string,
  repository: OrderFulfillmentRepository,
): Promise<{ changed: boolean }> {
  const changed = await repository.markPaidOrderFulfilled(orderId);

  if (changed) {
    return { changed: true };
  }

  const state = await repository.findOrderFulfillmentState(orderId);

  if (state?.status === "fulfilled") {
    return { changed: false };
  }

  if (!state) {
    throw new OrderFulfillmentError("Order not found.", "not_found");
  }

  if (!isOrderFulfillmentEligible(state)) {
    throw new OrderFulfillmentError(
      "Only payment-eligible paid orders can be marked as shipped.",
      "invalid_status",
    );
  }

  if (state.inventoryStatus === "exception") {
    throw new OrderFulfillmentError(
      "Resolve the inventory exception before marking this order as shipped.",
      "invalid_status",
    );
  }

  throw new OrderFulfillmentError(
    "Only payment-eligible paid orders can be marked as shipped.",
    "invalid_status",
  );
}
