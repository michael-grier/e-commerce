"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { retryOrderInventoryAllocation } from "@/lib/actions/orders";

export function ResolveInventoryExceptionButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function onRetryAllocation() {
    if (!window.confirm("Retry inventory allocation using current stock?")) {
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const result = await retryOrderInventoryAllocation({ orderId });

      if (!result.success) {
        setErrorMessage(result.message);
        return;
      }

      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mt-4 space-y-2">
      <Button disabled={isSubmitting} onClick={onRetryAllocation} type="button" variant="outline">
        {isSubmitting ? "Retrying…" : "Retry inventory allocation"}
      </Button>
      {errorMessage ? (
        <p className="max-w-xl text-red-800 text-sm" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
