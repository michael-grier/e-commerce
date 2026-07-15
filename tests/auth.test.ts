import { describe, expect, test } from "bun:test";

import { parseAdminUserIds } from "@/lib/auth/admin-user-ids";
import { adminEntityIdSchema } from "@/lib/validators/admin";

describe("admin user allowlist", () => {
  test("parses comma-separated Clerk user IDs and removes duplicates", () => {
    expect([...parseAdminUserIds(" user_admin123, user_admin456,user_admin123 ")]).toEqual([
      "user_admin123",
      "user_admin456",
    ]);
  });

  test("defaults to no administrators when the setting is absent", () => {
    expect(parseAdminUserIds(undefined).size).toBe(0);
  });

  test("rejects emails and non-user Clerk identifiers", () => {
    expect(() => parseAdminUserIds("admin@example.com")).toThrow();
    expect(() => parseAdminUserIds("org_admin123")).toThrow();
  });
});

describe("admin route parameters", () => {
  test("accepts UUID entity IDs and rejects untrusted route values", () => {
    expect(adminEntityIdSchema.parse("9c786325-fb57-46e3-b3ed-a60b653b3ad8")).toBe(
      "9c786325-fb57-46e3-b3ed-a60b653b3ad8",
    );
    expect(() => adminEntityIdSchema.parse("not-an-order-id")).toThrow();
  });
});
