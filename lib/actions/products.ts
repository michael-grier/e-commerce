"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/lib/actions/result";
import { validationFailure } from "@/lib/actions/result";
import { requireAdmin } from "@/lib/auth/require-admin";
import { revalidateProductSlugs } from "@/lib/catalog/cache";
import { getDb } from "@/lib/db/client";
import { products } from "@/lib/db/schema";
import {
  adminProductFormSchema,
  adminProductIdSchema,
  adminProductUpdateSchema,
  toProductMutationValues,
} from "@/lib/validators/product";

type CreatedProduct = {
  productId: string;
};

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

function revalidateAdminProduct(productId: string): void {
  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${productId}`);
}

export async function createProduct(input: unknown): Promise<ActionResult<CreatedProduct>> {
  await requireAdmin();

  const parsed = adminProductFormSchema.safeParse(input);

  if (!parsed.success) {
    return validationFailure(parsed.error);
  }

  try {
    const [product] = await getDb()
      .insert(products)
      .values(toProductMutationValues(parsed.data))
      .returning({ id: products.id });

    if (!product) {
      throw new Error("Product insert did not return a row.");
    }

    revalidateProductSlugs([parsed.data.slug]);
    revalidateAdminProduct(product.id);

    return {
      success: true,
      data: { productId: product.id },
    };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        success: false,
        message: "That slug is already used by another product.",
      };
    }

    throw error;
  }
}

export async function updateProduct(input: unknown): Promise<ActionResult> {
  await requireAdmin();

  const parsed = adminProductUpdateSchema.safeParse(input);

  if (!parsed.success) {
    return validationFailure(parsed.error);
  }

  const db = getDb();
  const existingProduct = await db.query.products.findFirst({
    columns: { slug: true },
    where: (products, { eq }) => eq(products.id, parsed.data.productId),
  });

  if (!existingProduct) {
    return {
      success: false,
      message: "Product not found.",
    };
  }

  try {
    await db
      .update(products)
      .set({
        ...toProductMutationValues(parsed.data),
        updatedAt: new Date(),
      })
      .where(eq(products.id, parsed.data.productId));

    revalidateProductSlugs([existingProduct.slug, parsed.data.slug]);
    revalidateAdminProduct(parsed.data.productId);

    return {
      success: true,
      data: undefined,
    };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        success: false,
        message: "That slug is already used by another product.",
      };
    }

    throw error;
  }
}

export async function archiveProduct(input: unknown): Promise<ActionResult> {
  await requireAdmin();

  const parsed = adminProductIdSchema.safeParse(input);

  if (!parsed.success) {
    return validationFailure(parsed.error);
  }

  const db = getDb();
  const [product] = await db
    .update(products)
    .set({
      status: "archived",
      updatedAt: new Date(),
    })
    .where(eq(products.id, parsed.data.productId))
    .returning({ slug: products.slug });

  if (!product) {
    return {
      success: false,
      message: "Product not found.",
    };
  }

  revalidateProductSlugs([product.slug]);
  revalidateAdminProduct(parsed.data.productId);

  return {
    success: true,
    data: undefined,
  };
}
