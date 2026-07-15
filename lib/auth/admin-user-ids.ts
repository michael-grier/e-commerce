import { z } from "zod";

const adminUserIdSchema = z
  .string()
  .trim()
  .max(255)
  .regex(/^user_[A-Za-z0-9_]+$/, "Admin user IDs must be Clerk user IDs.");

export function parseAdminUserIds(value: string | undefined): ReadonlySet<string> {
  if (!value) {
    return new Set();
  }

  const userIds = value
    .split(",")
    .map((userId) => userId.trim())
    .filter(Boolean);

  return new Set(z.array(adminUserIdSchema).parse(userIds));
}
