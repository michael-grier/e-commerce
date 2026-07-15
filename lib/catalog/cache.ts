import { revalidatePath, revalidateTag } from "next/cache";

export const CACHE_TAGS = {
  products: "products",
  product: (slug: string) => `product:${slug}`,
  home: "home",
} as const;

export function revalidateProducts(): void {
  revalidateTag(CACHE_TAGS.products);
  revalidateTag(CACHE_TAGS.home);
  revalidatePath("/products");
  revalidatePath("/");
}

export function revalidateProduct(slug: string): void {
  revalidateProductSlugs([slug]);
}

export function revalidateProductSlugs(slugs: string[]): void {
  for (const slug of new Set(slugs)) {
    revalidateTag(CACHE_TAGS.product(slug));
    revalidatePath(`/products/${slug}`);
  }

  revalidateProducts();
}
