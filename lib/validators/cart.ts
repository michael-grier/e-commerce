import { z } from "zod";

export const cartLineSchema = z
  .object({
    variantId: z.string().uuid(),
    quantity: z.number().int().positive(),
  })
  .strict();

export const cartSchema = z.array(cartLineSchema).min(1);

export const checkoutSchema = z
  .object({
    items: cartSchema,
  })
  .strict();

export const checkoutResponseSchema = z
  .object({
    url: z.string().url(),
  })
  .strict();

export const checkoutErrorResponseSchema = z
  .object({
    error: z.string().min(1),
  })
  .strict();

export const pendingCheckoutTokenSchema = z
  .string()
  .min(16)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/);

export const pendingCheckoutMetadataSchema = z
  .object({
    pendingCheckoutToken: pendingCheckoutTokenSchema,
  })
  .strict();

export type CartLine = z.infer<typeof cartLineSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type CheckoutResponse = z.infer<typeof checkoutResponseSchema>;
export type PendingCheckoutMetadata = z.infer<typeof pendingCheckoutMetadataSchema>;
