import type Stripe from "stripe";

type CheckoutSessionCompletion = Pick<Stripe.Checkout.Session, "payment_status" | "status">;

export function isCompletedPaidCheckout(session: CheckoutSessionCompletion): boolean {
  return (
    session.status === "complete" &&
    (session.payment_status === "paid" || session.payment_status === "no_payment_required")
  );
}
