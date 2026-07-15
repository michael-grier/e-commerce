"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { markOrderAsShipped } from "@/lib/actions/orders";

export function MarkOrderShippedButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function onMarkShipped() {
    if (!window.confirm("Mark this order as shipped?")) {
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const result = await markOrderAsShipped({ orderId });

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
    <div className="space-y-2">
      <Button disabled={isSubmitting} onClick={onMarkShipped} type="button">
        {isSubmitting ? "Updating…" : "Mark as shipped"}
      </Button>
      {errorMessage ? (
        <p className="max-w-xs text-destructive text-sm" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
