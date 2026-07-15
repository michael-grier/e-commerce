import type { Order } from "@/lib/db/schema";

export type OrderFulfillmentRepository = {
  markPaidOrderFulfilled: (orderId: string) => Promise<boolean>;
  findOrderStatus: (orderId: string) => Promise<Order["status"] | null>;
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

  const status = await repository.findOrderStatus(orderId);

  if (status === "fulfilled") {
    return { changed: false };
  }

  if (!status) {
    throw new OrderFulfillmentError("Order not found.", "not_found");
  }

  throw new OrderFulfillmentError("Only paid orders can be marked as shipped.", "invalid_status");
}
