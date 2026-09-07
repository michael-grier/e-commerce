import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/lib/db/client";
import { products, productVariants } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

/** Reads sellable stock without reserving it. Checkout still checks and reserves atomically. */
export async function GET(request: Request): Promise<Response> {
  const variantId = z.string().uuid().safeParse(new URL(request.url).searchParams.get("variantId"));
  if (!variantId.success) {
    return Response.json({ error: "Invalid variant." }, { status: 400 });
  }

  const [variant] = await getDb()
    .select({
      inventoryQty: productVariants.inventoryQty,
      reservedQty: productVariants.reservedQty,
    })
    .from(productVariants)
    .innerJoin(products, eq(products.id, productVariants.productId))
    .where(and(eq(productVariants.id, variantId.data), eq(products.status, "active")));

  return Response.json(
    { availableQty: variant ? Math.max(0, variant.inventoryQty - variant.reservedQty) : 0 },
    { headers: { "Cache-Control": "no-store" } },
  );
}
