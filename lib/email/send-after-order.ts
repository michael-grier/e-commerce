import type { StripeWebhookResult } from "@/lib/webhooks/stripe";

type OrderConfirmationSender = (orderId: string) => Promise<unknown>;
type EmailErrorReporter = (error: unknown) => void;

export async function sendConfirmationAfterOrderCommit(
  result: StripeWebhookResult,
  sendConfirmation: OrderConfirmationSender,
  reportError: EmailErrorReporter,
): Promise<boolean> {
  if (!result.handled || !("created" in result) || !result.created) {
    return false;
  }

  try {
    await sendConfirmation(result.orderId);
    return true;
  } catch (error) {
    reportError(error);
    return false;
  }
}
