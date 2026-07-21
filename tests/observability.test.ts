import { describe, expect, test } from "bun:test";

import {
  getServerExceptionTags,
  normalizeServerException,
} from "@/lib/observability/server-context";

describe("server error capture contract", () => {
  test("builds only stable non-customer tags", () => {
    expect(
      getServerExceptionTags({
        area: "checkout",
        operation: "checkout.create-session",
      }),
    ).toEqual({
      "app.area": "checkout",
      "app.operation": "checkout.create-session",
    });
  });

  test("preserves Error instances", () => {
    const error = new Error("Stripe request failed.");

    expect(normalizeServerException(error)).toBe(error);
  });

  test("does not serialize unknown thrown values", () => {
    const error = normalizeServerException({ secret: "must-not-be-captured" });

    expect(error.message).toBe("A non-Error value was thrown.");
    expect(error.message).not.toContain("must-not-be-captured");
  });
});
