import { z } from "zod";

/** Public availability only; prices and purchase authorization remain checkout's responsibility. */
export const cartStockResponseSchema = z.object({
  availableQty: z.number().int().nonnegative(),
});
