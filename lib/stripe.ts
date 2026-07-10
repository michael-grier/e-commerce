import "server-only";

import Stripe from "stripe";

import { requireEnv } from "@/lib/env";

let stripeClient: Stripe | undefined;

export function getStripe(): Stripe {
  if (!stripeClient) {
    stripeClient = new Stripe(requireEnv("STRIPE_SECRET_KEY"), {
      maxNetworkRetries: 2,
    });
  }

  return stripeClient;
}
