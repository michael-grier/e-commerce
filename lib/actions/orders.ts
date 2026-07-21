"use server";

import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/lib/actions/result";
import { validationFailure } from "@/lib/actions/result";
import { requireAdmin } from "@/lib/auth/require-admin";
import { captureServerException } from "@/lib/observability/server";
import { adminOrderRepository } from "@/lib/orders/admin-order-repository";
import { markOrderShipped, OrderFulfillmentError } from "@/lib/orders/mark-order-shipped";
import { markOrderShippedSchema } from "@/lib/validators/admin";

export async function markOrderAsShipped(input: unknown): Promise<ActionResult> {
  await requireAdmin();

  const parsed = markOrderShippedSchema.safeParse(input);

  if (!parsed.success) {
    return validationFailure(parsed.error);
  }

  try {
    await markOrderShipped(parsed.data.orderId, adminOrderRepository);
  } catch (error) {
    if (error instanceof OrderFulfillmentError) {
      return {
        success: false,
        message: error.message,
      };
    }

    captureServerException(error, {
      area: "admin",
      operation: "admin.mark-order-shipped",
    });
    throw error;
  }

  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${parsed.data.orderId}`);

  return {
    success: true,
    data: undefined,
  };
}
