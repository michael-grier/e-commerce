"use client";

import { Minus, Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

type QuantityControlProps = {
  value: number;
  min?: number;
  max?: number;
  label?: string;
  editable?: boolean;
  disabled?: boolean;
  onLimit?: () => void;
  onChange: (value: number) => void;
};

/** Bounded quantity buttons with optional direct entry for cart lines. */
export function QuantityControl({
  value,
  min = 1,
  max = 99,
  label,
  editable = false,
  disabled = false,
  onLimit,
  onChange,
}: QuantityControlProps) {
  const [isEmpty, setIsEmpty] = useState(false);
  const labelSuffix = label ? ` for ${label}` : "";

  return (
    <div className="inline-grid grid-cols-[2.5rem_3rem_2.5rem] overflow-hidden rounded-md border">
      <Button
        className="rounded-none"
        disabled={disabled || value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        size="icon"
        type="button"
        variant="ghost"
      >
        <Minus aria-hidden="true" />
        <span className="sr-only">Decrease quantity{labelSuffix}</span>
      </Button>
      {editable ? (
        <input
          aria-label={`Quantity${labelSuffix}`}
          className="min-w-0 appearance-none border-x bg-transparent text-center font-bold outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          disabled={disabled}
          inputMode="numeric"
          max={max}
          min={min}
          step={1}
          type="number"
          value={isEmpty ? "" : value}
          onBlur={() => setIsEmpty(false)}
          onChange={(event) => {
            const raw = event.currentTarget.value;
            setIsEmpty(raw === "");
            if (raw === "") return;
            const entered = Number(raw);
            if (!Number.isFinite(entered)) return;
            const quantity = Math.min(max, Math.max(min, Math.trunc(entered)));
            // Reset the DOM even when clamping produces the already-stored quantity.
            event.currentTarget.value = String(quantity);
            if (entered > max) onLimit?.();
            onChange(quantity);
          }}
        />
      ) : (
        <output
          aria-label={label ? `Quantity for ${label}` : undefined}
          aria-live="polite"
          className="grid place-items-center border-x font-bold"
        >
          {value}
        </output>
      )}
      <Button
        className="rounded-none"
        disabled={disabled || value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        size="icon"
        type="button"
        variant="ghost"
      >
        <Plus aria-hidden="true" />
        <span className="sr-only">Increase quantity{labelSuffix}</span>
      </Button>
    </div>
  );
}
