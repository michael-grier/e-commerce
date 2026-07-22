import { describe, expect, test } from "bun:test";

import { MAX_CART_LINE_QUANTITY, MAX_CART_LINES } from "@/lib/cart/constants";
import { readJsonRequest } from "@/lib/http/read-json-request";
import { checkoutSchema } from "@/lib/validators/cart";

const variantId = "3f5277e9-b73f-4a94-9bc8-5f9d06f9f5d6";

function jsonRequest(body: string, headers: HeadersInit = {}): Request {
  return new Request("http://localhost/api/test", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body,
  });
}

describe("bounded JSON requests", () => {
  test("accepts JSON content types with parameters", async () => {
    const result = await readJsonRequest(
      jsonRequest('{"ok":true}', { "Content-Type": "application/json; charset=utf-8" }),
      1024,
    );

    expect(result).toEqual({ success: true, data: { ok: true } });
  });

  test("rejects unsupported media types and malformed JSON", async () => {
    const unsupported = await readJsonRequest(
      jsonRequest('{"ok":true}', { "Content-Type": "text/plain" }),
      1024,
    );
    const malformed = await readJsonRequest(jsonRequest("{"), 1024);

    expect(unsupported).toMatchObject({ success: false, status: 415 });
    expect(malformed).toMatchObject({ success: false, status: 400 });
  });

  test("rejects declared and streamed bodies over the byte limit", async () => {
    const declared = await readJsonRequest(jsonRequest("{}", { "Content-Length": "2048" }), 1024);
    const streamed = await readJsonRequest(
      jsonRequest(JSON.stringify({ value: "x".repeat(100) })),
      32,
    );

    expect(declared).toMatchObject({ success: false, status: 413 });
    expect(streamed).toMatchObject({ success: false, status: 413 });
  });
});

describe("checkout request complexity", () => {
  test("caps individual and combined variant quantities", () => {
    expect(
      checkoutSchema.safeParse({
        items: [{ variantId, quantity: MAX_CART_LINE_QUANTITY + 1 }],
      }).success,
    ).toBe(false);
    expect(
      checkoutSchema.safeParse({
        items: [
          { variantId, quantity: MAX_CART_LINE_QUANTITY },
          { variantId, quantity: 1 },
        ],
      }).success,
    ).toBe(false);
  });

  test("caps the number of submitted cart lines", () => {
    const items = Array.from({ length: MAX_CART_LINES + 1 }, (_, index) => ({
      variantId: `00000000-0000-4000-8000-${index.toString().padStart(12, "0")}`,
      quantity: 1,
    }));

    expect(checkoutSchema.safeParse({ items }).success).toBe(false);
  });
});
