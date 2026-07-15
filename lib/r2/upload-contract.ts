import { z } from "zod";

export const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024;

export const allowedProductImageTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

export const productImageContentTypeSchema = z.enum(allowedProductImageTypes);

export const productImageUploadRequestSchema = z
  .object({
    productId: z.string().uuid(),
    fileName: z.string().trim().min(1).max(255),
    contentType: productImageContentTypeSchema,
    size: z.number().int().positive().max(MAX_PRODUCT_IMAGE_BYTES),
  })
  .strict();

export const productImageObjectKeySchema = z
  .string()
  .min(1)
  .max(320)
  .regex(
    /^products\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}-[a-z0-9][a-z0-9-]{0,79}\.(?:jpg|png|webp|avif)$/,
    "Invalid product image object key.",
  );

export const productImageUploadResponseSchema = z
  .object({
    uploadUrl: z.string().url(),
    objectKey: productImageObjectKeySchema,
    publicUrl: z.string().url(),
  })
  .strict();

export type ProductImageContentType = z.infer<typeof productImageContentTypeSchema>;
export type ProductImageUploadRequest = z.infer<typeof productImageUploadRequestSchema>;

const extensionByContentType: Record<ProductImageContentType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

export function createProductImageObjectKey(
  input: Pick<ProductImageUploadRequest, "productId" | "fileName" | "contentType">,
  uniqueId = crypto.randomUUID(),
): string {
  const baseName = input.fileName
    .replace(/\.[^.]+$/, "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  const safeName = baseName || "image";
  const extension = extensionByContentType[input.contentType];

  return `products/${input.productId}/${uniqueId}-${safeName}.${extension}`;
}

export function isProductImageObjectKey(objectKey: string, productId: string): boolean {
  return (
    objectKey.startsWith(`products/${productId}/`) &&
    productImageObjectKeySchema.safeParse(objectKey).success
  );
}

export function doesProductImageKeyMatchContentType(
  objectKey: string,
  contentType: ProductImageContentType,
): boolean {
  return objectKey.endsWith(`.${extensionByContentType[contentType]}`);
}

export function buildR2PublicUrl(publicBaseUrl: string, objectKey: string): string {
  const baseUrl = publicBaseUrl.endsWith("/") ? publicBaseUrl : `${publicBaseUrl}/`;
  const encodedKey = objectKey.split("/").map(encodeURIComponent).join("/");

  return new URL(encodedKey, baseUrl).toString();
}

export function getR2ObjectKeyFromPublicUrl(
  publicBaseUrl: string,
  objectUrl: string,
): string | null {
  try {
    const baseUrl = new URL(publicBaseUrl.endsWith("/") ? publicBaseUrl : `${publicBaseUrl}/`);
    const parsedObjectUrl = new URL(objectUrl);

    if (baseUrl.origin !== parsedObjectUrl.origin) {
      return null;
    }

    if (!parsedObjectUrl.pathname.startsWith(baseUrl.pathname)) {
      return null;
    }

    const encodedKey = parsedObjectUrl.pathname.slice(baseUrl.pathname.length);
    return decodeURIComponent(encodedKey);
  } catch {
    return null;
  }
}
