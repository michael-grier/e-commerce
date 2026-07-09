import type { SearchParams } from "nuqs/server";

import { CatalogFilters } from "@/components/shop/catalog-filters";
import { ProductGrid } from "@/components/shop/product-grid";
import { Button } from "@/components/ui/button";
import { getCatalogPage } from "@/lib/catalog/queries";
import { catalogSearchParamsCache } from "@/lib/catalog/search-params";

export const revalidate = 300;

type ProductsPageProps = {
  searchParams: Promise<SearchParams>;
};

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const parsedSearchParams = await catalogSearchParamsCache.parse(searchParams);
  const catalog = await getCatalogPage(parsedSearchParams);

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-6 py-10">
      <header className="space-y-3 border-b pb-8">
        <p className="font-semibold text-muted-foreground text-sm uppercase tracking-wide">
          Catalog
        </p>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <h1 className="font-black text-5xl tracking-normal">Shop All</h1>
            <p className="max-w-2xl text-muted-foreground">
              Decks, apparel, and accessories with inventory managed directly from Postgres.
            </p>
          </div>
          <Button variant="outline">Filters</Button>
        </div>
      </header>
      <CatalogFilters categories={catalog.categories} totalProducts={catalog.totalProducts} />
      <ProductGrid products={catalog.products} />
      {catalog.totalPages > 1 ? (
        <nav className="flex items-center justify-center gap-3" aria-label="Catalog pagination">
          <p className="text-muted-foreground text-sm">
            Page {catalog.page} of {catalog.totalPages}
          </p>
        </nav>
      ) : null}
    </main>
  );
}
