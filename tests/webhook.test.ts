import { describe, expect, test } from "bun:test";
import type Stripe from "stripe";

import {
  assertInventoryDecremented,
  InventoryUnavailableError,
  type PaidCheckoutData,
  PaidOrderError,
  resolveOrderItemSnapshots,
} from "@/lib/orders/create-paid-order";
import {
  constructVerifiedStripeEvent,
  parsePaidCheckoutData,
  processStripeEvent,
  StripeWebhookSignatureError,
} from "@/lib/webhooks/stripe";

const variantId = "3f5277e9-b73f-4a94-9bc8-5f9d06f9f5d6";

function makeCheckoutSession(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "cs_test_paid",
    mode: "payment",
    payment_status: "paid",
    payment_intent: "pi_test_paid",
    metadata: {
      pendingCheckoutToken: "checkout_abcDEF123456789",
    },
    customer_details: {
      email: "skater@example.com",
    },
    amount_subtotal: 8900,
    amount_total: 10400,
    currency: "CAD",
    total_details: {
      amount_shipping: 1500,
      amount_tax: 0,
    },
    shipping_cost: {
      amount_total: 1500,
    },
    collected_information: {
      shipping_details: {
        name: "Test Skater",
        address: {
          line1: "123 Test Street",
          city: "Calgary",
          state: "AB",
          postal_code: "T1T 1T1",
          country: "CA",
        },
      },
    },
    ...overrides,
  };
}

describe("Stripe webhook signatures", () => {
  test("passes the unchanged raw body to Stripe verification", () => {
    const expectedEvent = {
      type: "customer.created",
      data: { object: {} },
    } as unknown as Stripe.Event;

    const event = constructVerifiedStripeEvent(
      '{"raw":"body"}',
      "signature-header",
      "whsec_test",
      (payload, signature, secret) => {
        expect(payload).toBe('{"raw":"body"}');
        expect(signature).toBe("signature-header");
        expect(secret).toBe("whsec_test");
        return expectedEvent;
      },
    );

    expect(event).toBe(expectedEvent);
  });

  test("rejects missing and invalid signatures", () => {
    const unusedConstructor = () => ({}) as Stripe.Event;

    expect(() =>
      constructVerifiedStripeEvent("payload", null, "whsec_test", unusedConstructor),
    ).toThrow(StripeWebhookSignatureError);
    expect(() =>
      constructVerifiedStripeEvent("payload", "invalid", "whsec_test", () => {
        throw new Error("Signature mismatch");
      }),
    ).toThrow(StripeWebhookSignatureError);
  });
});

describe("paid Checkout Session parsing", () => {
  test("maps Stripe-authoritative totals, customer, shipping, and metadata", () => {
    expect(parsePaidCheckoutData(makeCheckoutSession())).toEqual({
      pendingCheckoutToken: "checkout_abcDEF123456789",
      stripeSessionId: "cs_test_paid",
      stripePaymentIntentId: "pi_test_paid",
      email: "skater@example.com",
      subtotalCents: 8900,
      taxCents: 0,
      shippingCents: 1500,
      totalCents: 10400,
      currency: "cad",
      shippingAddress: {
        name: "Test Skater",
        address: {
          line1: "123 Test Street",
          city: "Calgary",
          state: "AB",
          postal_code: "T1T 1T1",
          country: "CA",
        },
      },
    });
  });

  test("accepts zero tax and ignores unpaid completed Sessions", () => {
    expect(
      parsePaidCheckoutData(
        makeCheckoutSession({
          payment_status: "unpaid",
          total_details: null,
          shipping_cost: null,
        }),
      ),
    ).toBeNull();
  });

  test("rejects metadata outside the pending token contract", () => {
    expect(() =>
      parsePaidCheckoutData(
        makeCheckoutSession({
          metadata: {
            pendingCheckoutToken: "checkout_abcDEF123456789",
            cart: "untrusted",
          },
        }),
      ),
    ).toThrow();
  });
});

describe("Stripe event processing", () => {
  test("ignores unrelated and unpaid events without touching persistence", async () => {
    let writes = 0;
    const writer = {
      createPaidOrder: async () => {
        writes += 1;
        return { created: true, orderId: "order_unused" };
      },
    };

    expect(
      await processStripeEvent({ type: "product.created", data: { object: {} } }, writer),
    ).toEqual({ handled: false });
    expect(
      await processStripeEvent(
        {
          type: "checkout.session.completed",
          data: { object: makeCheckoutSession({ payment_status: "unpaid" }) },
        },
        writer,
      ),
    ).toEqual({ handled: false });
    expect(writes).toBe(0);
  });

  test("passes a paid Session to persistence and reports idempotent results", async () => {
    let persistedCheckout: PaidCheckoutData | undefined;
    let alreadyCreated = false;
    const writer = {
      createPaidOrder: async (checkout: PaidCheckoutData) => {
        persistedCheckout = checkout;

        if (alreadyCreated) {
          return { created: false, orderId: "order_123" };
        }

        alreadyCreated = true;
        return { created: true, orderId: "order_123" };
      },
    };
    const event = {
      type: "checkout.session.completed",
      data: { object: makeCheckoutSession() },
    };

    expect(await processStripeEvent(event, writer)).toEqual({
      handled: true,
      created: true,
      orderId: "order_123",
    });
    expect(await processStripeEvent(event, writer)).toEqual({
      handled: true,
      created: false,
      orderId: "order_123",
    });
    expect(persistedCheckout?.stripeSessionId).toBe("cs_test_paid");
  });

  test("handles asynchronous payment success events through the same writer", async () => {
    const writer = {
      createPaidOrder: async () => ({ created: true, orderId: "order_async" }),
    };

    expect(
      await processStripeEvent(
        {
          type: "checkout.session.async_payment_succeeded",
          data: { object: makeCheckoutSession() },
        },
        writer,
      ),
    ).toEqual({ handled: true, created: true, orderId: "order_async" });
  });
});

describe("paid order snapshots and inventory", () => {
  test("builds immutable order item snapshots from current database values", () => {
    expect(
      resolveOrderItemSnapshots(
        [{ variantId, quantity: 2 }],
        [
          {
            id: variantId,
            productName: "Database Deck",
            variantName: '8.25"',
            priceCents: 8900,
          },
        ],
      ),
    ).toEqual([
      {
        variantId,
        productNameSnapshot: "Database Deck",
        variantNameSnapshot: '8.25"',
        unitPriceCentsSnapshot: 8900,
        quantity: 2,
      },
    ]);
  });

  test("fails missing snapshots and conditional inventory misses", () => {
    expect(() => resolveOrderItemSnapshots([{ variantId, quantity: 1 }], [])).toThrow(
      PaidOrderError,
    );
    expect(() => assertInventoryDecremented([], { variantId, quantity: 2 })).toThrow(
      InventoryUnavailableError,
    );
  });

  test("accepts exactly one matching conditional inventory update", () => {
    expect(() => assertInventoryDecremented([variantId], { variantId, quantity: 2 })).not.toThrow();
    expect(() =>
      assertInventoryDecremented([variantId, variantId], { variantId, quantity: 2 }),
    ).toThrow(InventoryUnavailableError);
    expect(() =>
      assertInventoryDecremented(["879dd483-16c9-4d6c-885f-b00525f84923"], {
        variantId,
        quantity: 2,
      }),
    ).toThrow(InventoryUnavailableError);
  });
});
