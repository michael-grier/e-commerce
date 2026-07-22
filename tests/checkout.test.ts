import { describe, expect, test } from "bun:test";
import type Stripe from "stripe";

import { isCompletedPaidCheckout } from "@/lib/checkout/completion";
import {
  type CheckoutRepository,
  createHostedCheckout,
} from "@/lib/checkout/create-hosted-checkout";
import { toCheckoutErrorResponse } from "@/lib/checkout/error-response";
import { CheckoutError } from "@/lib/checkout/errors";
import {
  buildStripeLineItems,
  type CheckoutVariantRecord,
  createPendingCheckoutLineSnapshots,
  resolveCheckoutLines,
} from "@/lib/checkout/items";
import { buildShippingOptions, parseAllowedShippingCountries } from "@/lib/checkout/shipping";
import { checkoutSchema } from "@/lib/validators/cart";

const variantId = "3f5277e9-b73f-4a94-9bc8-5f9d06f9f5d6";

const activeVariant: CheckoutVariantRecord = {
  id: variantId,
  productName: "Database Deck",
  productStatus: "active",
  variantName: '8.25"',
  priceCents: 8900,
  inventoryQty: 3,
};

describe("checkout completion", () => {
  test("clears purchase intent only for completed paid sessions", () => {
    expect(isCompletedPaidCheckout({ status: "complete", payment_status: "paid" })).toBe(true);
    expect(
      isCompletedPaidCheckout({ status: "complete", payment_status: "no_payment_required" }),
    ).toBe(true);
    expect(isCompletedPaidCheckout({ status: "open", payment_status: "paid" })).toBe(false);
    expect(isCompletedPaidCheckout({ status: "complete", payment_status: "unpaid" })).toBe(false);
  });
});

describe("checkout error reporting boundary", () => {
  test("does not report validation or catalog errors", async () => {
    const reportedErrors: unknown[] = [];
    const validationResult = checkoutSchema.safeParse({ items: [] });

    if (validationResult.success) {
      throw new Error("Expected invalid checkout input.");
    }

    const validationResponse = toCheckoutErrorResponse(validationResult.error, (error) => {
      reportedErrors.push(error);
    });
    const stockResponse = toCheckoutErrorResponse(
      new CheckoutError("Only 1 item remains.", 409),
      (error) => {
        reportedErrors.push(error);
      },
    );

    expect(validationResponse.status).toBe(400);
    expect(stockResponse.status).toBe(409);
    expect(await stockResponse.json()).toEqual({ error: "Only 1 item remains." });
    expect(reportedErrors).toEqual([]);
  });

  test("reports unexpected and internal checkout failures with a safe response", async () => {
    const reportedErrors: unknown[] = [];
    const stripeError = new CheckoutError("Stripe did not return a Checkout URL.", 500);
    const databaseError = new Error("Database unavailable.");
    const stripeResponse = toCheckoutErrorResponse(stripeError, (error) => {
      reportedErrors.push(error);
    });
    const databaseResponse = toCheckoutErrorResponse(databaseError, (error) => {
      reportedErrors.push(error);
    });

    expect(stripeResponse.status).toBe(500);
    expect(databaseResponse.status).toBe(500);
    expect(await stripeResponse.json()).toEqual({ error: "Unable to start checkout." });
    expect(await databaseResponse.json()).toEqual({ error: "Unable to start checkout." });
    expect(reportedErrors).toEqual([stripeError, databaseError]);
  });
});

describe("checkout item resolution", () => {
  test("constructs Stripe line items only from resolved database fields", () => {
    const [resolvedLine] = resolveCheckoutLines([{ variantId, quantity: 2 }], [activeVariant]);

    expect(buildStripeLineItems([resolvedLine])).toEqual([
      {
        quantity: 2,
        price_data: {
          currency: "cad",
          unit_amount: 8900,
          tax_behavior: "exclusive",
          product_data: {
            name: "Database Deck",
            description: '8.25"',
          },
        },
      },
    ]);
  });

  test("rejects unknown and inactive variants as unavailable", () => {
    try {
      resolveCheckoutLines([{ variantId, quantity: 1 }], []);
      throw new Error("Expected unknown variant resolution to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(CheckoutError);
      expect((error as CheckoutError).status).toBe(404);
    }

    try {
      resolveCheckoutLines(
        [{ variantId, quantity: 1 }],
        [{ ...activeVariant, productStatus: "archived" }],
      );
      throw new Error("Expected inactive variant resolution to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(CheckoutError);
      expect((error as CheckoutError).status).toBe(404);
    }
  });

  test("rejects insufficient combined stock for duplicate cart lines", () => {
    try {
      resolveCheckoutLines(
        [
          { variantId, quantity: 2 },
          { variantId, quantity: 2 },
        ],
        [activeVariant],
      );
      throw new Error("Expected insufficient stock resolution to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(CheckoutError);
      expect((error as CheckoutError).status).toBe(409);
      expect((error as CheckoutError).message).toContain("only has 3 available");
    }
  });
});

describe("checkout shipping", () => {
  test("uses the standard rate below the free-shipping threshold", () => {
    expect(
      buildShippingOptions(9999, {
        standardRateCents: 1500,
        freeThresholdCents: 10000,
      }),
    ).toEqual([
      {
        shipping_rate_data: {
          type: "fixed_amount",
          display_name: "Standard shipping",
          fixed_amount: { amount: 1500, currency: "cad" },
          tax_behavior: "exclusive",
        },
      },
    ]);
  });

  test("uses free shipping at or above the configured threshold", () => {
    const [option] = buildShippingOptions(10000, {
      standardRateCents: 1500,
      freeThresholdCents: 10000,
    });

    expect(option.shipping_rate_data?.display_name).toBe("Free shipping");
    expect(option.shipping_rate_data?.fixed_amount?.amount).toBe(0);
  });

  test("parses, normalizes, and validates configured countries", () => {
    expect(parseAllowedShippingCountries("ca, US,ca")).toEqual(["CA", "US"]);
    expect(() => parseAllowedShippingCountries("CA,GB")).toThrow("must contain only CA and/or US");
  });
});

describe("hosted checkout orchestration", () => {
  test("validates input before calling dependencies", async () => {
    let repositoryCalled = false;

    await expect(
      createHostedCheckout(
        { items: [] },
        {
          appUrl: "http://localhost:3000",
          allowedCountries: ["CA", "US"],
          standardShippingRateCents: 1500,
          freeShippingThresholdCents: 10000,
          taxEnabled: true,
        },
        {
          repository: {
            findVariants: async () => {
              repositoryCalled = true;
              return [];
            },
            createPendingCheckout: async () => {},
            setStripeSessionId: async () => {},
          },
          sessions: {
            create: async () => ({ id: "cs_test_unused", url: null }),
          },
          createToken: () => "unused-token",
        },
      ),
    ).rejects.toThrow();

    expect(repositoryCalled).toBe(false);
  });

  test("persists immutable resolved lines and links compact metadata to the Stripe session", async () => {
    const pendingWrites: Parameters<CheckoutRepository["createPendingCheckout"]>[0][] = [];
    const sessionLinks: Array<{ token: string; sessionId: string }> = [];
    let sessionParams: Stripe.Checkout.SessionCreateParams | undefined;
    const now = new Date("2026-07-10T12:00:00.000Z");

    const result = await createHostedCheckout(
      {
        items: [
          { variantId, quantity: 1 },
          { variantId, quantity: 1 },
        ],
      },
      {
        appUrl: "http://localhost:3000/",
        allowedCountries: ["CA", "US"],
        standardShippingRateCents: 1500,
        freeShippingThresholdCents: 20000,
        taxEnabled: true,
      },
      {
        repository: {
          findVariants: async () => [activeVariant],
          createPendingCheckout: async (checkout) => {
            pendingWrites.push(checkout);
          },
          setStripeSessionId: async (token, sessionId) => {
            sessionLinks.push({ token, sessionId });
          },
        },
        sessions: {
          create: async (params) => {
            sessionParams = params;
            return { id: "cs_test_123", url: "https://checkout.stripe.com/c/pay/test" };
          },
        },
        createToken: () => "checkout_abcDEF123456789",
        now: () => now,
      },
    );

    expect(result).toEqual({ url: "https://checkout.stripe.com/c/pay/test" });
    expect(pendingWrites).toEqual([
      {
        token: "checkout_abcDEF123456789",
        items: [{ variantId, quantity: 2 }],
        lineItems: [
          {
            variantId,
            productName: "Database Deck",
            variantName: '8.25"',
            unitPriceCents: 8900,
            quantity: 2,
            currency: "cad",
          },
        ],
        expiresAt: new Date("2026-07-10T13:00:00.000Z"),
      },
    ]);
    expect(sessionParams?.metadata).toEqual({
      pendingCheckoutToken: "checkout_abcDEF123456789",
    });
    expect(sessionParams?.line_items?.[0]).toMatchObject({
      quantity: 2,
      price_data: { unit_amount: 8900 },
    });
    expect(sessionParams?.automatic_tax).toEqual({ enabled: true });
    expect(sessionParams?.shipping_address_collection?.allowed_countries).toEqual(["CA", "US"]);
    expect(sessionLinks).toEqual([{ token: "checkout_abcDEF123456789", sessionId: "cs_test_123" }]);
  });

  test("derives pending snapshots from the same resolved lines sent to Stripe", () => {
    const [resolvedLine] = resolveCheckoutLines([{ variantId, quantity: 2 }], [activeVariant]);

    expect(createPendingCheckoutLineSnapshots([resolvedLine])).toEqual([
      {
        variantId,
        productName: "Database Deck",
        variantName: '8.25"',
        unitPriceCents: 8900,
        quantity: 2,
        currency: "cad",
      },
    ]);
    expect(buildStripeLineItems([resolvedLine])[0]).toMatchObject({
      quantity: 2,
      price_data: {
        currency: "cad",
        unit_amount: 8900,
        product_data: { name: "Database Deck", description: '8.25"' },
      },
    });
  });

  test("can disable Stripe Tax while preserving hosted Checkout", async () => {
    let sessionParams: Stripe.Checkout.SessionCreateParams | undefined;

    const result = await createHostedCheckout(
      { items: [{ variantId, quantity: 1 }] },
      {
        appUrl: "http://localhost:3000",
        allowedCountries: ["CA", "US"],
        standardShippingRateCents: 1500,
        freeShippingThresholdCents: 10000,
        taxEnabled: false,
      },
      {
        repository: {
          findVariants: async () => [activeVariant],
          createPendingCheckout: async () => {},
          setStripeSessionId: async () => {},
        },
        sessions: {
          create: async (params) => {
            sessionParams = params;
            return { id: "cs_test_tax_disabled", url: "https://checkout.stripe.com/test" };
          },
        },
        createToken: () => "checkout_taxDisabled123",
      },
    );

    expect(result.url).toBe("https://checkout.stripe.com/test");
    expect(sessionParams?.automatic_tax).toEqual({ enabled: false });
  });
});
