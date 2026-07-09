import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";
import type { z } from "zod";

import { pendingCheckouts } from "@/lib/db/schema";
import { cartSchema, pendingCheckoutTokenSchema } from "@/lib/validators/cart";

export const pendingCheckoutSelectSchema = createSelectSchema(pendingCheckouts, {
  token: pendingCheckoutTokenSchema,
  items: cartSchema,
});

export const pendingCheckoutInsertSchema = createInsertSchema(pendingCheckouts, {
  token: pendingCheckoutTokenSchema,
  items: cartSchema,
}).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const pendingCheckoutUpdateSchema = createUpdateSchema(pendingCheckouts, {
  token: pendingCheckoutTokenSchema,
  items: cartSchema,
}).omit({
  id: true,
  token: true,
  items: true,
  createdAt: true,
  expiresAt: true,
});

export type PendingCheckoutInsert = z.infer<typeof pendingCheckoutInsertSchema>;
export type PendingCheckoutUpdate = z.infer<typeof pendingCheckoutUpdateSchema>;
