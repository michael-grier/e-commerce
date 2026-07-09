import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";
import { z } from "zod";

import { productImages, products, productVariants } from "@/lib/db/schema";

export const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens.");

export const productSelectSchema = createSelectSchema(products);

export const productInsertSchema = createInsertSchema(products, {
  slug: slugSchema,
  name: (schema) => schema.trim().min(1).max(160),
  description: (schema) => schema.trim().max(4000),
  category: (schema) => schema.trim().max(80),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const productUpdateSchema = createUpdateSchema(products, {
  slug: slugSchema,
  name: (schema) => schema.trim().min(1).max(160),
  description: (schema) => schema.trim().max(4000),
  category: (schema) => schema.trim().max(80),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const productVariantSelectSchema = createSelectSchema(productVariants);

export const productVariantInsertSchema = createInsertSchema(productVariants, {
  name: (schema) => schema.trim().min(1).max(120),
  sku: (schema) => schema.trim().min(1).max(120),
  priceCents: (schema) => schema.int().nonnegative(),
  inventoryQty: (schema) => schema.int().nonnegative(),
}).omit({
  id: true,
});

export const productVariantUpdateSchema = createUpdateSchema(productVariants, {
  name: (schema) => schema.trim().min(1).max(120),
  sku: (schema) => schema.trim().min(1).max(120),
  priceCents: (schema) => schema.int().nonnegative(),
  inventoryQty: (schema) => schema.int().nonnegative(),
}).omit({
  id: true,
});

export const productImageSelectSchema = createSelectSchema(productImages);

export const productImageInsertSchema = createInsertSchema(productImages, {
  url: (schema) => schema.url(),
  alt: (schema) => schema.trim().max(180),
  position: (schema) => schema.int().nonnegative(),
}).omit({
  id: true,
});

export const productImageUpdateSchema = createUpdateSchema(productImages, {
  url: (schema) => schema.url(),
  alt: (schema) => schema.trim().max(180),
  position: (schema) => schema.int().nonnegative(),
}).omit({
  id: true,
});

export type ProductInsert = z.infer<typeof productInsertSchema>;
export type ProductUpdate = z.infer<typeof productUpdateSchema>;
export type ProductVariantInsert = z.infer<typeof productVariantInsertSchema>;
export type ProductVariantUpdate = z.infer<typeof productVariantUpdateSchema>;
export type ProductImageInsert = z.infer<typeof productImageInsertSchema>;
export type ProductImageUpdate = z.infer<typeof productImageUpdateSchema>;
