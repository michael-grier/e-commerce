import "server-only";

import { and, eq } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import { orders } from "@/lib/db/schema";
import type { OrderFulfillmentRepository } from "@/lib/orders/mark-order-shipped";

export const adminOrderRepository: OrderFulfillmentRepository = {
  async markPaidOrderFulfilled(orderId) {
    const updatedOrders = await getDb()
      .update(orders)
      .set({ status: "fulfilled" })
      .where(and(eq(orders.id, orderId), eq(orders.status, "paid")))
      .returning({ id: orders.id });

    return updatedOrders.length === 1;
  },

  async findOrderStatus(orderId) {
    const order = await getDb().query.orders.findFirst({
      columns: { status: true },
      where: (orders, { eq }) => eq(orders.id, orderId),
    });

    return order?.status ?? null;
  },
};
