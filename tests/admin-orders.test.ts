import { describe, expect, mock, test } from "bun:test";

import {
  markOrderShipped,
  OrderFulfillmentError,
  type OrderFulfillmentRepository,
} from "@/lib/orders/mark-order-shipped";
import { markOrderShippedSchema } from "@/lib/validators/admin";

const orderId = "823071ff-f180-43ed-82df-af334ccfe35a";

function makeRepository(
  overrides: Partial<OrderFulfillmentRepository> = {},
): OrderFulfillmentRepository {
  return {
    markPaidOrderFulfilled: mock(async () => true),
    findOrderStatus: mock(async (): Promise<"paid"> => "paid"),
    ...overrides,
  };
}

describe("mark order shipped contract", () => {
  test("accepts only an order UUID", () => {
    expect(markOrderShippedSchema.parse({ orderId })).toEqual({ orderId });
    expect(() => markOrderShippedSchema.parse({ orderId: "not-an-order" })).toThrow();
    expect(() => markOrderShippedSchema.parse({ orderId, status: "refunded" })).toThrow();
  });

  test("conditionally changes a paid order to fulfilled", async () => {
    const repository = makeRepository();

    await expect(markOrderShipped(orderId, repository)).resolves.toEqual({ changed: true });
    expect(repository.markPaidOrderFulfilled).toHaveBeenCalledWith(orderId);
    expect(repository.findOrderStatus).not.toHaveBeenCalled();
  });

  test("treats an already fulfilled order as an idempotent success", async () => {
    const repository = makeRepository({
      markPaidOrderFulfilled: mock(async () => false),
      findOrderStatus: mock(async (): Promise<"fulfilled"> => "fulfilled"),
    });

    await expect(markOrderShipped(orderId, repository)).resolves.toEqual({ changed: false });
  });

  test("rejects missing orders and invalid status transitions", async () => {
    const missingOrderRepository = makeRepository({
      markPaidOrderFulfilled: mock(async () => false),
      findOrderStatus: mock(async (): Promise<null> => null),
    });
    const refundedOrderRepository = makeRepository({
      markPaidOrderFulfilled: mock(async () => false),
      findOrderStatus: mock(async (): Promise<"refunded"> => "refunded"),
    });

    await expect(markOrderShipped(orderId, missingOrderRepository)).rejects.toEqual(
      new OrderFulfillmentError("Order not found.", "not_found"),
    );
    await expect(markOrderShipped(orderId, refundedOrderRepository)).rejects.toEqual(
      new OrderFulfillmentError("Only paid orders can be marked as shipped.", "invalid_status"),
    );
  });
});
