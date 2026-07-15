import { z } from "zod";

const shippingDetailsSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.object({
    line1: z.string().min(1).nullable().optional(),
    line2: z.string().min(1).nullable().optional(),
    city: z.string().min(1).nullable().optional(),
    state: z.string().min(1).nullable().optional(),
    postal_code: z.string().min(1).nullable().optional(),
    country: z.string().min(1).nullable().optional(),
  }),
});

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
