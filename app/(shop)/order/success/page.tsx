import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function OrderSuccessPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-start justify-center gap-6 px-6">
      <div className="space-y-2">
        <p className="font-semibold text-muted-foreground text-sm uppercase tracking-wide">
          Order received
        </p>
        <h1 className="font-black text-4xl tracking-normal">Thanks for your order.</h1>
        <p className="max-w-xl text-muted-foreground">
          Your payment was received. We’ll send an order summary and shipping details to the email
          address provided at checkout.
        </p>
      </div>
      <Button asChild>
        <Link href="/products">Continue shopping</Link>
      </Button>
    </main>
  );
}
