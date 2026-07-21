"use server";

import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/lib/actions/result";
import { validationFailure } from "@/lib/actions/result";
import { requireAdmin } from "@/lib/auth/require-admin";
import { revalidateProduct } from "@/lib/catalog/cache";
import { getDb } from "@/lib/db/client";
import { pendingCheckouts, productVariants } from "@/lib/db/schema";
import { captureServerException } from "@/lib/observability/server";
import {
  adminVariantCreateSchema,
  adminVariantDeleteSchema,
  adminVariantUpdateSchema,
  toVariantMutationValues,
} from "@/lib/validators/product";

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

function revalidateAdminVariant(productId: string, slug: string): void {
  revalidateProduct(slug);
  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${productId}`);
}

export async function createVariant(input: unknown): Promise<ActionResult> {
  await requireAdmin();

  const parsed = adminVariantCreateSchema.safeParse(input);

  if (!parsed.success) {
    return validationFailure(parsed.error);
  }

  const db = getDb();
  const product = await db.query.products.findFirst({
    columns: { slug: true },
    where: (products, { eq }) => eq(products.id, parsed.data.productId),
  });

  if (!product) {
    return {
      success: false,
      message: "Product not found.",
    };
  }

  try {
    await db.insert(productVariants).values({
      productId: parsed.data.productId,
      ...toVariantMutationValues(parsed.data),
    });

    revalidateAdminVariant(parsed.data.productId, product.slug);

    return {
      success: true,
      data: undefined,
    };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        success: false,
        message: "That SKU is already used by another variant.",
      };
    }

    captureServerException(error, {
      area: "admin",
      operation: "admin.create-variant",
    });
    throw error;
  }
}

export async function updateVariant(input: unknown): Promise<ActionResult> {
  await requireAdmin();

  const parsed = adminVariantUpdateSchema.safeParse(input);

  if (!parsed.success) {
    return validationFailure(parsed.error);
  }

  const db = getDb();
  const product = await db.query.products.findFirst({
    columns: { slug: true },
    where: (products, { eq }) => eq(products.id, parsed.data.productId),
  });

  if (!product) {
    return {
      success: false,
      message: "Product not found.",
    };
  }

  try {
    const updatedVariants = await db
      .update(productVariants)
      .set(toVariantMutationValues(parsed.data))
      .where(
        and(
          eq(productVariants.id, parsed.data.variantId),
          eq(productVariants.productId, parsed.data.productId),
        ),
      )
      .returning({ id: productVariants.id });

    if (updatedVariants.length !== 1) {
      return {
        success: false,
        message: "Variant not found.",
      };
    }

    revalidateAdminVariant(parsed.data.productId, product.slug);

    return {
      success: true,
      data: undefined,
    };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        success: false,
        message: "That SKU is already used by another variant.",
      };
    }

    captureServerException(error, {
      area: "admin",
      operation: "admin.update-variant",
    });
    throw error;
  }
}

export async function deleteVariant(input: unknown): Promise<ActionResult> {
  await requireAdmin();

  const parsed = adminVariantDeleteSchema.safeParse(input);

  if (!parsed.success) {
    return validationFailure(parsed.error);
  }

  const db = getDb();
  const product = await db.query.products.findFirst({
    columns: { slug: true, status: true },
    where: (products, { eq }) => eq(products.id, parsed.data.productId),
  });

  if (!product) {
    return {
      success: false,
      message: "Product not found.",
    };
  }

  if (product.status === "active") {
    return {
      success: false,
      message: "Set the product to draft or archived before deleting a variant.",
    };
  }

  const activeCheckouts = await db
    .select({ id: pendingCheckouts.id })
    .from(pendingCheckouts)
    .where(
      and(
        isNull(pendingCheckouts.completedAt),
        gt(pendingCheckouts.expiresAt, new Date()),
        sql`exists (
          select 1
          from jsonb_array_elements(${pendingCheckouts.items}) as item
          where item ->> 'variantId' = ${parsed.data.variantId}
        )`,
      ),
    )
    .limit(1);

  if (activeCheckouts.length > 0) {
    return {
      success: false,
      message: "This variant is part of an active checkout. Try again after it expires.",
    };
  }

  const deletedVariants = await db
    .delete(productVariants)
    .where(
      and(
        eq(productVariants.id, parsed.data.variantId),
        eq(productVariants.productId, parsed.data.productId),
      ),
    )
    .returning({ id: productVariants.id });

  if (deletedVariants.length !== 1) {
    return {
      success: false,
      message: "Variant not found.",
    };
  }

  revalidateAdminVariant(parsed.data.productId, product.slug);

  return {
    success: true,
    data: undefined,
  };
}
