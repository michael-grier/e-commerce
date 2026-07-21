import { isCheckoutValidationError } from "@/lib/checkout/create-hosted-checkout";
import { CheckoutError } from "@/lib/checkout/errors";

type CheckoutErrorReporter = (error: unknown) => void;

export function toCheckoutErrorResponse(
  error: unknown,
  reportUnexpectedError: CheckoutErrorReporter,
): Response {
  if (isCheckoutValidationError(error)) {
    return Response.json({ error: "Invalid checkout request." }, { status: 400 });
  }

  if (error instanceof CheckoutError && error.status !== 500) {
    return Response.json({ error: error.message }, { status: error.status });
  }

  reportUnexpectedError(error);

  return Response.json({ error: "Unable to start checkout." }, { status: 500 });
}
