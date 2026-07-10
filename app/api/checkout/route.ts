import { randomUUID } from "node:crypto";

import {
  createHostedCheckout,
  isCheckoutValidationError,
} from "@/lib/checkout/create-hosted-checkout";
import { CheckoutError } from "@/lib/checkout/errors";
import { checkoutRepository } from "@/lib/checkout/repository";
import { parseAllowedShippingCountries } from "@/lib/checkout/shipping";
import { env, requireEnv } from "@/lib/env";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  try {
    return Response.json(
      await createHostedCheckout(
        payload,
        {
          appUrl: requireEnv("NEXT_PUBLIC_APP_URL"),
          allowedCountries: parseAllowedShippingCountries(env.SHIPPING_ALLOWED_COUNTRIES),
          standardShippingRateCents: requireEnv("SHIPPING_STANDARD_RATE_CENTS"),
          freeShippingThresholdCents: requireEnv("SHIPPING_FREE_THRESHOLD_CENTS"),
          taxEnabled: env.STRIPE_TAX_ENABLED,
        },
        {
          repository: checkoutRepository,
          sessions: getStripe().checkout.sessions,
          createToken: randomUUID,
        },
      ),
    );
  } catch (error) {
    if (isCheckoutValidationError(error)) {
      return Response.json({ error: "Invalid checkout request." }, { status: 400 });
    }

    if (error instanceof CheckoutError) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    console.error("Checkout session creation failed.", error);
    return Response.json({ error: "Unable to start checkout." }, { status: 500 });
  }
}
