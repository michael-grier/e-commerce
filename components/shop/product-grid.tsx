import type { CatalogProduct } from "@/lib/catalog/queries";

import { EmptyState } from "./empty-state";
import { ProductCard } from "./product-card";

type ProductGridProps = {
  products: CatalogProduct[];
};

export function ProductGrid({ products }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <EmptyState
        title="No products found"
        description="Adjust the filters or seed a local database to populate the catalog."
      />
    );
  }

  return (
    <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
