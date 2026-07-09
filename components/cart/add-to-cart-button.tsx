"use client";

import { ShoppingCart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useCartStore } from "@/lib/cart/store";
import type { AddCartLineInput } from "@/lib/cart/types";

type AddToCartButtonProps = {
  line: AddCartLineInput;
  disabled?: boolean;
};

export function AddToCartButton({ line, disabled }: AddToCartButtonProps) {
  const addLine = useCartStore((state) => state.addLine);

  return (
    <Button
      disabled={disabled}
      onClick={() => addLine(line)}
      size="lg"
      type="button"
      className="w-full"
    >
      <ShoppingCart aria-hidden="true" />
      Add to cart
    </Button>
  );
}
