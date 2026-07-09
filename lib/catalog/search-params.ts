import {
  createSearchParamsCache,
  parseAsInteger,
  parseAsString,
  parseAsStringEnum,
} from "nuqs/server";

export const catalogSortValues = ["newest", "price-asc", "price-desc", "name-asc"] as const;
export type CatalogSort = (typeof catalogSortValues)[number];

const catalogSortParserValues = [...catalogSortValues];

export const catalogSearchParamsCache = createSearchParamsCache({
  q: parseAsString.withDefault(""),
  category: parseAsString.withDefault(""),
  sort: parseAsStringEnum<CatalogSort>(catalogSortParserValues).withDefault("newest"),
  page: parseAsInteger.withDefault(1),
});

export type CatalogSearchParams =
  ReturnType<typeof catalogSearchParamsCache.parse> extends Promise<infer T> ? T : never;
