import { randomUUID } from "node:crypto";

import { createHostedCheckout } from "@/lib/checkout/create-hosted-checkout";
import { toCheckoutErrorResponse } from "@/lib/checkout/error-response";
import { checkoutRepository } from "@/lib/checkout/repository";
import { parseAllowedShippingCountries } from "@/lib/checkout/shipping";
import { env, requireEnv } from "@/lib/env";
import { captureServerException } from "@/lib/observability/server";
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
    return toCheckoutErrorResponse(error, (unexpectedError) => {
      captureServerException(unexpectedError, {
        area: "checkout",
        operation: "checkout.create-session",
      });
    });
  }
}
