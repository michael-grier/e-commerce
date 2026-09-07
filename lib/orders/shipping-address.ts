import { z } from "zod";

const shippingDetailsSchema = z.object({
  name: z.string().trim().optional(),
  address: z.object({
    // Stripe can send unused fields as empty strings. They must not hide the whole address.
    line1: z.string().trim().nullable().optional(),
    line2: z.string().trim().nullable().optional(),
    city: z.string().trim().nullable().optional(),
    state: z.string().trim().nullable().optional(),
    postal_code: z.string().trim().nullable().optional(),
    country: z.string().trim().nullable().optional(),
  }),
});

/** Formats recorded shipping details for admin pages and emails, omitting blank fields. */
export function getShippingAddressLines(input: unknown): string[] {
  const parsed = shippingDetailsSchema.safeParse(input);

  if (!parsed.success) {
    return [];
  }

  const { name, address } = parsed.data;
  const region = [address.state, address.postal_code].filter(Boolean).join(" ");
  const locality = [address.city, region].filter(Boolean).join(", ");

  return Array.from(
    new Set(
      [name, address.line1, address.line2, locality, address.country].filter(
        (line): line is string => Boolean(line),
      ),
    ),
  );
}
