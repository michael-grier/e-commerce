import type Stripe from "stripe";

import { requireEnv } from "@/lib/env";
import { paidOrderRepository } from "@/lib/orders/paid-order-repository";
import { getStripe } from "@/lib/stripe";
import { constructVerifiedStripeEvent, processStripeEvent } from "@/lib/webhooks/stripe";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");
  const stripe = getStripe();
  const webhookSecret = requireEnv("STRIPE_WEBHOOK_SECRET");
  let event: Stripe.Event;

  try {
    event = constructVerifiedStripeEvent(
      payload,
      signature,
      webhookSecret,
      stripe.webhooks.constructEvent.bind(stripe.webhooks),
    );
  } catch {
    return new Response("Invalid signature.", { status: 400 });
  }

  try {
    await processStripeEvent(event, paidOrderRepository);
    return new Response("ok");
  } catch (error) {
    console.error("Stripe webhook processing failed.", error);
    return new Response("Webhook processing failed.", { status: 500 });
  }
}
