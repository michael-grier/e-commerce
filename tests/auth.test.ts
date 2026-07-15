import { describe, expect, test } from "bun:test";

import { parseAdminUserIds } from "@/lib/auth/admin-user-ids";

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
