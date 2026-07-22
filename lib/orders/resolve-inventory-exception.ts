export type InventoryExceptionResolution =
  | "allocated"
  | "already_allocated"
  | "insufficient_inventory"
  | "invalid_status"
  | "not_found";

export type InventoryExceptionRepository = {
  allocateInventoryForException: (orderId: string) => Promise<InventoryExceptionResolution>;
};

export class InventoryExceptionResolutionError extends Error {
  constructor(
    message: string,
    readonly code: Exclude<InventoryExceptionResolution, "allocated" | "already_allocated">,
  ) {
    super(message);
    this.name = "InventoryExceptionResolutionError";
  }
}

export async function resolveInventoryException(
  orderId: string,
  repository: InventoryExceptionRepository,
): Promise<{ changed: boolean }> {
  const result = await repository.allocateInventoryForException(orderId);

  switch (result) {
    case "allocated":
      return { changed: true };
    case "already_allocated":
      return { changed: false };
    case "insufficient_inventory":
      throw new InventoryExceptionResolutionError(
        "Inventory is still insufficient. Restock the affected variants and try again.",
        result,
      );
    case "invalid_status":
      throw new InventoryExceptionResolutionError(
        "Only payment-eligible paid orders with an inventory exception can retry allocation.",
        result,
      );
    case "not_found":
      throw new InventoryExceptionResolutionError("Order not found.", result);
  }
}
