import "server-only";

import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";

import { parseAdminUserIds } from "@/lib/auth/admin-user-ids";
import { env } from "@/lib/env";

const adminUserIds = parseAdminUserIds(env.ADMIN_USER_IDS);

export async function requireAdmin(): Promise<{ userId: string }> {
  const { userId } = await auth.protect();

  if (!adminUserIds.has(userId)) {
    notFound();
  }

  return { userId };
}
