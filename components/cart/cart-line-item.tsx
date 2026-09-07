"use client";

import { Trash2 } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { MAX_CART_LINE_QUANTITY } from "@/lib/cart/constants";
import { useCartStore } from "@/lib/cart/store";
import type { CartDisplayLine } from "@/lib/cart/types";
import { useCartStock } from "@/lib/cart/use-cart-stock";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

import { QuantityControl } from "../shop/quantity-control";

type CartLineItemProps = {
  line: CartDisplayLine;
  compact?: boolean;
};

/** Shared cart row, bounded by current sellable stock in both cart views. */
export function CartLineItem({ line, compact = false }: CartLineItemProps) {
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeLine = useCartStore((state) => state.removeLine);
  const { availableQty, failed } = useCartStock(line.variantId);
  const [adjusted, setAdjusted] = useState(false);
  const maxQuantity = Math.min(availableQty ?? 0, MAX_CART_LINE_QUANTITY);

  useEffect(() => {
    // Keep sold-out lines removable instead of writing zero into the positive-quantity cart contract.
    if (maxQuantity > 0 && line.quantity > maxQuantity) {
      updateQuantity(line.variantId, maxQuantity);
      setAdjusted(true);
    } else if (line.quantity < maxQuantity) {
      setAdjusted(false);
    }
  }, [line.quantity, line.variantId, maxQuantity, updateQuantity]);

  const quantityLabel = `${line.productName}, ${line.variantName}`;

  return (
    <article
      className={cn(
        "grid gap-4 border-b py-5",
        compact ? "grid-cols-[5rem_minmax(0,1fr)]" : "sm:grid-cols-[6rem_1fr_auto]",
      )}
    >
      <div
        className={cn(
          "relative aspect-square overflow-hidden rounded-md bg-muted",
          compact && "size-20",
        )}
      >
        {line.imageUrl ? (
          <Image
            alt=""
            className="h-full w-full object-contain object-center"
            fill
            sizes={compact ? "5rem" : "6rem"}
            src={line.imageUrl}
            unoptimized
          />
        ) : null}
      </div>
      <div className="min-w-0 space-y-2">
        <div className={cn("min-w-0", compact && "flex items-start justify-between gap-3")}>
          <div className="min-w-0">
            {compact ? (
              <h3 className="truncate font-grotesk font-semibold text-lg">{line.productName}</h3>
            ) : (
              <h2 className="truncate font-grotesk font-semibold text-xl">{line.productName}</h2>
            )}
            <p className="text-muted-foreground text-sm">{line.variantName}</p>
          </div>
          {compact ? (
            <p className="shrink-0 font-grotesk font-semibold">
              {formatMoney(line.priceCents * line.quantity)}
            </p>
          ) : null}
        </div>
        <p className="font-bold text-sm">{formatMoney(line.priceCents)} each</p>
        <div className={cn(compact && "flex items-center justify-between gap-3")}>
          <QuantityControl
            disabled={availableQty === null || maxQuantity === 0 || failed}
            editable
            label={quantityLabel}
            max={Math.max(1, maxQuantity)}
            onLimit={() => setAdjusted(true)}
            onChange={(quantity) => updateQuantity(line.variantId, quantity)}
            value={line.quantity}
          />
          {compact ? (
            <Button
              onClick={() => removeLine(line.variantId)}
              size="icon"
              type="button"
              variant="ghost"
            >
              <Trash2 aria-hidden="true" />
              <span className="sr-only">Remove {quantityLabel}</span>
            </Button>
          ) : null}
        </div>
        {failed || availableQty === null || availableQty === 0 || adjusted ? (
          <p
            className={cn(
              "text-sm",
              availableQty === null && !failed ? "text-muted-foreground" : "text-destructive",
            )}
            role="status"
          >
            {failed
              ? "Unable to check stock. Try reopening the cart."
              : availableQty === null
                ? "Checking stock availability."
                : availableQty === 0
                  ? "Out of stock. Remove this item to continue."
                  : `Maximum available: ${maxQuantity}. Quantity adjusted.`}
          </p>
        ) : null}
      </div>
      {compact ? null : (
        <div className="flex items-start justify-between gap-4 sm:flex-col sm:items-end">
          <p className="font-grotesk font-semibold text-xl">
            {formatMoney(line.priceCents * line.quantity)}
          </p>
          <Button
            onClick={() => removeLine(line.variantId)}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Trash2 aria-hidden="true" />
            <span className="sr-only">Remove {quantityLabel}</span>
          </Button>
        </div>
      )}
    </article>
  );
}
