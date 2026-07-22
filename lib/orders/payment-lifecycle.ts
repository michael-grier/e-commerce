import type { Order } from "@/lib/db/schema";

export type RefundStatus = Order["refundStatus"];
export type DisputeStatus = Order["disputeStatus"];

export type PaymentLifecycleUpdate = {
  stripeEventId: string;
  stripePaymentIntentId: string;
  kind: "refund" | "dispute";
  refundedCents: number | null;
  currency: string | null;
  disputeStatus: Exclude<DisputeStatus, "none"> | null;
  occurredAt: Date;
};

export type PaymentLifecycleState = {
  refundStatus: RefundStatus;
  refundedCents: number;
  disputeStatus: DisputeStatus;
};

export type RecordPaymentLifecycleResult = {
  changed: boolean;
  orderId: string | null;
};

export type PaymentLifecycleWriter = {
  recordPaymentLifecycleUpdate: (
    update: PaymentLifecycleUpdate,
  ) => Promise<RecordPaymentLifecycleResult>;
};

export class PaymentLifecycleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentLifecycleError";
  }
}

export function derivePaymentLifecycleState(
  totalCents: number,
  currency: string,
  events: PaymentLifecycleUpdate[],
): PaymentLifecycleState {
  let refundedCents = 0;
  let latestDispute: PaymentLifecycleUpdate | null = null;

  for (const event of events) {
    if (event.kind === "refund") {
      if (event.refundedCents === null || event.currency === null) {
        throw new PaymentLifecycleError("A persisted refund event is missing financial data.");
      }

      if (event.currency !== currency) {
        throw new PaymentLifecycleError("A Stripe refund currency does not match its order.");
      }

      refundedCents = Math.max(refundedCents, event.refundedCents);
      continue;
    }

    if (!event.disputeStatus) {
      throw new PaymentLifecycleError("A persisted dispute event is missing its status.");
    }

    if (
      !latestDispute ||
      event.occurredAt > latestDispute.occurredAt ||
      (event.occurredAt.getTime() === latestDispute.occurredAt.getTime() &&
        disputePrecedence(event.disputeStatus) >
          disputePrecedence(latestDispute.disputeStatus ?? "won"))
    ) {
      latestDispute = event;
    }
  }

  if (refundedCents > totalCents) {
    throw new PaymentLifecycleError("Stripe refunded more than the persisted order total.");
  }

  return {
    refundStatus: refundedCents === 0 ? "none" : refundedCents === totalCents ? "full" : "partial",
    refundedCents,
    disputeStatus: latestDispute?.disputeStatus ?? "none",
  };
}

export function isOrderFulfillmentEligible(
  order: Pick<Order, "status" | "refundStatus" | "disputeStatus">,
): boolean {
  return (
    order.status === "paid" &&
    order.refundStatus !== "full" &&
    (order.disputeStatus === "none" || order.disputeStatus === "won")
  );
}

function disputePrecedence(status: Exclude<DisputeStatus, "none">): number {
  switch (status) {
    case "open":
      return 3;
    case "lost":
      return 2;
    case "prevented":
      return 2;
    case "won":
      return 1;
  }
}
