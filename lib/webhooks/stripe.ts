import type Stripe from "stripe";
import { z } from "zod";

import type {
  CreatePaidOrderResult,
  PaidCheckoutData,
  PaidOrderWriter,
} from "@/lib/orders/create-paid-order";
import { pendingCheckoutMetadataSchema } from "@/lib/validators/cart";

const stripeAddressSchema = z
  .object({
    city: z.string().nullable().optional(),
    country: z.string().nullable().optional(),
    line1: z.string().nullable().optional(),
    line2: z.string().nullable().optional(),
    postal_code: z.string().nullable().optional(),
    state: z.string().nullable().optional(),
  })
  .passthrough();

const shippingDetailsSchema = z
  .object({
    name: z.string().min(1),
    address: stripeAddressSchema,
  })
  .passthrough();

const paidCheckoutSessionSchema = z
  .object({
    id: z.string().min(1),
    mode: z.literal("payment"),
    payment_status: z.enum(["paid", "unpaid", "no_payment_required"]),
    payment_intent: z
      .union([z.string().min(1), z.object({ id: z.string().min(1) }).passthrough(), z.null()])
      .optional(),
    metadata: z.record(z.string(), z.string()).nullable(),
    customer_details: z
      .object({
        email: z.string().email(),
      })
      .passthrough(),
    amount_subtotal: z.number().int().nonnegative(),
    amount_total: z.number().int().nonnegative(),
    currency: z
      .string()
      .length(3)
      .transform((currency) => currency.toLowerCase()),
    total_details: z
      .object({
        amount_shipping: z.number().int().nonnegative().nullable().optional(),
        amount_tax: z.number().int().nonnegative(),
      })
      .passthrough()
      .nullable(),
    shipping_cost: z
      .object({
        amount_total: z.number().int().nonnegative(),
      })
      .passthrough()
      .nullable(),
    collected_information: z
      .object({
        shipping_details: shippingDetailsSchema.nullable(),
      })
      .passthrough()
      .nullable(),
  })
  .passthrough();

type StripeEventLike = {
  type: string;
  data: {
    object: unknown;
  };
};

export type StripeWebhookResult = { handled: false } | ({ handled: true } & CreatePaidOrderResult);

export class StripeWebhookSignatureError extends Error {
  constructor() {
    super("Invalid Stripe webhook signature.");
    this.name = "StripeWebhookSignatureError";
  }
}

type StripeEventConstructor = (payload: string, signature: string, secret: string) => Stripe.Event;

export function constructVerifiedStripeEvent(
  payload: string,
  signature: string | null,
  secret: string,
  constructEvent: StripeEventConstructor,
): Stripe.Event {
  if (!signature) {
    throw new StripeWebhookSignatureError();
  }

  try {
    return constructEvent(payload, signature, secret);
  } catch {
    throw new StripeWebhookSignatureError();
  }
}

function getPaymentIntentId(
  paymentIntent: z.infer<typeof paidCheckoutSessionSchema>["payment_intent"],
): string | null {
  if (!paymentIntent) {
    return null;
  }

  return typeof paymentIntent === "string" ? paymentIntent : paymentIntent.id;
}

export function parsePaidCheckoutData(input: unknown): PaidCheckoutData | null {
  const session = paidCheckoutSessionSchema.parse(input);

  if (session.payment_status === "unpaid") {
    return null;
  }

  const metadata = pendingCheckoutMetadataSchema.parse(session.metadata);

  return {
    pendingCheckoutToken: metadata.pendingCheckoutToken,
    stripeSessionId: session.id,
    stripePaymentIntentId: getPaymentIntentId(session.payment_intent),
    email: session.customer_details.email,
    subtotalCents: session.amount_subtotal,
    taxCents: session.total_details?.amount_tax ?? 0,
    shippingCents:
      session.shipping_cost?.amount_total ?? session.total_details?.amount_shipping ?? 0,
    totalCents: session.amount_total,
    currency: session.currency,
    shippingAddress: session.collected_information?.shipping_details ?? null,
  };
}

export async function processStripeEvent(
  event: StripeEventLike,
  writer: PaidOrderWriter,
): Promise<StripeWebhookResult> {
  if (
    event.type !== "checkout.session.completed" &&
    event.type !== "checkout.session.async_payment_succeeded"
  ) {
    return { handled: false };
  }

  const checkout = parsePaidCheckoutData(event.data.object);

  if (!checkout) {
    return { handled: false };
  }

  return {
    handled: true,
    ...(await writer.createPaidOrder(checkout)),
  };
}
