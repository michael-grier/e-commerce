"use client";

import { Trash2 } from "lucide-react";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { useCartStore } from "@/lib/cart/store";
import type { CartDisplayLine } from "@/lib/cart/types";
import { formatMoney } from "@/lib/money";

import { QuantityControl } from "../shop/quantity-control";

type CartLineItemProps = {
  line: CartDisplayLine;
};

export function CartLineItem({ line }: CartLineItemProps) {
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeLine = useCartStore((state) => state.removeLine);

  return (
    <article className="grid gap-4 border-b py-5 sm:grid-cols-[6rem_1fr_auto]">
      <div className="relative aspect-square overflow-hidden rounded-md bg-muted">
        {line.imageUrl ? (
          <Image
            alt=""
            className="h-full w-full object-contain object-center"
            fill
            sizes="6rem"
            src={line.imageUrl}
            unoptimized
          />
        ) : null}
      </div>
      <div className="min-w-0 space-y-2">
        <div className="min-w-0">
          <h2 className="truncate font-black text-xl">{line.productName}</h2>
          <p className="text-muted-foreground text-sm">{line.variantName}</p>
        </div>
        <p className="font-bold">{formatMoney(line.priceCents)}</p>
        <QuantityControl
          onChange={(quantity) => updateQuantity(line.variantId, quantity)}
          value={line.quantity}
        />
      </div>
      <div className="flex items-start justify-between gap-4 sm:flex-col sm:items-end">
        <p className="font-black text-xl">{formatMoney(line.priceCents * line.quantity)}</p>
        <Button
          onClick={() => removeLine(line.variantId)}
          size="icon"
          type="button"
          variant="ghost"
        >
          <Trash2 aria-hidden="true" />
          <span className="sr-only">Remove {line.productName}</span>
        </Button>
      </div>
    </article>
  );
}
