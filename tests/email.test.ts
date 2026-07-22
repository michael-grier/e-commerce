import { describe, expect, test } from "bun:test";
import { render } from "@react-email/components";
import { createElement } from "react";
import type { CreateEmailOptions } from "resend";

import {
  deliverOrderConfirmation,
  type OrderConfirmationDelivery,
  OrderConfirmationDeliveryError,
} from "@/lib/email/deliver-order-confirmation";
import { OrderConfirmationEmail } from "@/lib/email/order-confirmation";
import { sendConfirmationAfterOrderCommit } from "@/lib/email/send-after-order";
import { getShippingAddressLines } from "@/lib/orders/shipping-address";

const delivery: OrderConfirmationDelivery = {
  orderId: "9c786325-fb57-46e3-b3ed-a60b653b3ad8",
  recipientEmail: "skater@example.com",
  order: {
    orderNumber: "SK8-20260713-ABC12345",
    currency: "cad",
    subtotalCents: 8900,
    taxCents: 0,
    shippingCents: 1500,
    totalCents: 10400,
    items: [
      {
        productName: "Database Deck",
        variantName: '8.25"',
        unitPriceCents: 8900,
        quantity: 1,
      },
    ],
    shippingAddressLines: ["Test Skater", "123 Test Street", "Calgary, AB T1T 1T1", "CA"],
  },
};

describe("order confirmation template", () => {
  test("renders persisted snapshots, totals, shipping, and support details", async () => {
    const html = await render(
      createElement(OrderConfirmationEmail, {
        order: delivery.order,
        supportEmail: "support@example.com",
      }),
    );

    expect(html).toContain("SK8-20260713-ABC12345");
    expect(html).toContain("Database Deck");
    expect(html).toContain("8.25&quot;");
    expect(html).toContain("$104.00");
    expect(html).toContain("123 Test Street");
    expect(html).toContain("support@example.com");
    expect(html).not.toContain(delivery.orderId);
  });

  test("formats Stripe shipping details and tolerates unavailable addresses", () => {
    expect(
      getShippingAddressLines({
        name: "Test Skater",
        address: {
          line1: "123 Test Street",
          city: "Calgary",
          state: "AB",
          postal_code: "T1T 1T1",
          country: "CA",
        },
      }),
    ).toEqual(["Test Skater", "123 Test Street", "Calgary, AB T1T 1T1", "CA"]);
    expect(getShippingAddressLines(null)).toEqual([]);
    expect(getShippingAddressLines({ address: "invalid" })).toEqual([]);
  });
});

describe("order confirmation delivery", () => {
  test("sends a React email with a stable order idempotency key", async () => {
    let message: CreateEmailOptions | undefined;
    let idempotencyKey: string | undefined;

    const emailId = await deliverOrderConfirmation(
      delivery,
      {
        from: "Skate Shop <orders@example.com>",
        supportEmail: "support@example.com",
      },
      {
        send: async (input, options) => {
          message = input;
          idempotencyKey = options.idempotencyKey;
          return {
            data: { id: "email_123" },
            error: null,
            headers: null,
          };
        },
      },
    );

    expect(emailId).toBe("email_123");
    expect(message).toMatchObject({
      from: "Skate Shop <orders@example.com>",
      to: "skater@example.com",
      replyTo: "support@example.com",
      subject: "Order SK8-20260713-ABC12345 confirmed",
    });
    expect(idempotencyKey).toBe(`order-confirmation/${delivery.orderId}`);
  });

  test("turns Resend API errors into catchable delivery errors", async () => {
    await expect(
      deliverOrderConfirmation(
        delivery,
        {
          from: "Skate Shop <orders@example.com>",
          supportEmail: "support@example.com",
        },
        {
          send: async () => ({
            data: null,
            error: {
              message: "Sender domain is not verified.",
              name: "validation_error",
              statusCode: 422,
            },
            headers: null,
          }),
        },
      ),
    ).rejects.toThrow(OrderConfirmationDeliveryError);
  });
});

describe("post-commit email boundary", () => {
  test("sends only for newly created orders", async () => {
    const sentOrderIds: string[] = [];
    const send = async (orderId: string) => {
      sentOrderIds.push(orderId);
    };

    expect(
      await sendConfirmationAfterOrderCommit(
        { handled: true, created: true, orderId: delivery.orderId },
        send,
        () => {},
      ),
    ).toBe(true);
    expect(
      await sendConfirmationAfterOrderCommit(
        { handled: true, created: false, orderId: delivery.orderId },
        send,
        () => {},
      ),
    ).toBe(false);
    expect(
      await sendConfirmationAfterOrderCommit(
        {
          handled: true,
          paymentUpdated: true,
          changed: true,
          orderId: delivery.orderId,
        },
        send,
        () => {},
      ),
    ).toBe(false);
    expect(await sendConfirmationAfterOrderCommit({ handled: false }, send, () => {})).toBe(false);
    expect(sentOrderIds).toEqual([delivery.orderId]);
  });

  test("reports email failure without rejecting the persisted webhook result", async () => {
    const reportedErrors: unknown[] = [];
    const result = await sendConfirmationAfterOrderCommit(
      { handled: true, created: true, orderId: delivery.orderId },
      async () => {
        throw new Error("Resend unavailable");
      },
      (error) => {
        reportedErrors.push(error);
      },
    );

    expect(result).toBe(false);
    expect(reportedErrors).toHaveLength(1);
    expect(reportedErrors[0]).toBeInstanceOf(Error);
  });
});
