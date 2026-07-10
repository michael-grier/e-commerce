import type Stripe from "stripe";
import { z } from "zod";

import {
  buildStripeLineItems,
  type CheckoutVariantRecord,
  getCheckoutSubtotalCents,
  resolveCheckoutLines,
} from "@/lib/checkout/items";
import { type AllowedShippingCountry, buildShippingOptions } from "@/lib/checkout/shipping";
import type { PendingCheckoutItem } from "@/lib/db/schema";
import { checkoutSchema } from "@/lib/validators/cart";

import { CheckoutError } from "./errors";

const pendingCheckoutLifetimeMs = 60 * 60 * 1000;

export type CheckoutRepository = {
  findVariants: (variantIds: string[]) => Promise<CheckoutVariantRecord[]>;
  createPendingCheckout: (checkout: {
    token: string;
    items: PendingCheckoutItem[];
    expiresAt: Date;
  }) => Promise<void>;
  setStripeSessionId: (token: string, stripeSessionId: string) => Promise<void>;
};

export type CheckoutSessionClient = {
  create: (
    params: Stripe.Checkout.SessionCreateParams,
  ) => Promise<Pick<Stripe.Checkout.Session, "id" | "url">>;
};

export type HostedCheckoutSettings = {
  appUrl: string;
  allowedCountries: AllowedShippingCountry[];
  standardShippingRateCents: number;
  freeShippingThresholdCents: number;
};

type HostedCheckoutDependencies = {
  repository: CheckoutRepository;
  sessions: CheckoutSessionClient;
  createToken: () => string;
  now?: () => Date;
};

export async function createHostedCheckout(
  input: unknown,
  settings: HostedCheckoutSettings,
  dependencies: HostedCheckoutDependencies,
): Promise<{ url: string }> {
  const { items } = checkoutSchema.parse(input);
  const variantIds = Array.from(new Set(items.map((item) => item.variantId)));
  const variants = await dependencies.repository.findVariants(variantIds);
  const resolvedLines = resolveCheckoutLines(items, variants);
  const pendingItems = resolvedLines.map(({ id, quantity }) => ({ variantId: id, quantity }));
  const token = dependencies.createToken();
  const expiresAt = new Date(
    (dependencies.now?.() ?? new Date()).getTime() + pendingCheckoutLifetimeMs,
  );

  await dependencies.repository.createPendingCheckout({
    token,
    items: pendingItems,
    expiresAt,
  });

  const appUrl = settings.appUrl.replace(/\/$/, "");
  const session = await dependencies.sessions.create({
    mode: "payment",
    line_items: buildStripeLineItems(resolvedLines),
    automatic_tax: { enabled: true },
    shipping_address_collection: {
      allowed_countries: settings.allowedCountries,
    },
    shipping_options: buildShippingOptions(getCheckoutSubtotalCents(resolvedLines), {
      standardRateCents: settings.standardShippingRateCents,
      freeThresholdCents: settings.freeShippingThresholdCents,
    }),
    success_url: `${appUrl}/order/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/cart`,
    expires_at: Math.floor(expiresAt.getTime() / 1000),
    metadata: {
      pendingCheckoutToken: token,
    },
  });

  await dependencies.repository.setStripeSessionId(token, session.id);

  if (!session.url) {
    throw new CheckoutError("Stripe did not return a hosted Checkout URL.", 500);
  }

  return { url: session.url };
}

export function isCheckoutValidationError(error: unknown): error is z.ZodError {
  return error instanceof z.ZodError;
}
