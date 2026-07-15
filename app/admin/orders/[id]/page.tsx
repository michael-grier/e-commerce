import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { OrderStatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { formatAdminDate } from "@/lib/admin/format";
import { getAdminOrderById } from "@/lib/admin/queries";
import { formatMoney } from "@/lib/money";
import { getShippingAddressLines } from "@/lib/orders/shipping-address";

type AdminOrderPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AdminOrderPage({ params }: AdminOrderPageProps) {
  const { id } = await params;
  const order = await getAdminOrderById(id);

  if (!order) {
    notFound();
  }

  const shippingAddressLines = getShippingAddressLines(order.shippingAddress);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <Button asChild className="-ml-3" size="sm" variant="ghost">
            <Link href={"/admin/orders" as Route} prefetch={false}>
              ← Back to orders
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-black text-4xl tracking-normal">{order.orderNumber}</h1>
            <OrderStatusBadge status={order.status} />
          </div>
          <p className="text-muted-foreground">
            Created{" "}
            <time dateTime={order.createdAt.toISOString()}>{formatAdminDate(order.createdAt)}</time>
          </p>
        </div>
        <p className="font-black text-3xl">{formatMoney(order.totalCents, order.currency)}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section aria-labelledby="customer-heading" className="rounded-lg border bg-background p-6">
          <h2 className="font-bold text-xl" id="customer-heading">
            Customer
          </h2>
          <a
            className="mt-3 inline-block underline-offset-4 hover:underline"
            href={`mailto:${order.email}`}
          >
            {order.email}
          </a>
        </section>
        <section aria-labelledby="shipping-heading" className="rounded-lg border bg-background p-6">
          <h2 className="font-bold text-xl" id="shipping-heading">
            Shipping address
          </h2>
          {shippingAddressLines.length > 0 ? (
            <address className="mt-3 not-italic text-muted-foreground">
              {shippingAddressLines.map((line) => (
                <span className="block" key={line}>
                  {line}
                </span>
              ))}
            </address>
          ) : (
            <p className="mt-3 text-muted-foreground">No shipping address was recorded.</p>
          )}
        </section>
      </div>

      <section aria-labelledby="items-heading" className="space-y-4">
        <h2 className="font-bold text-2xl" id="items-heading">
          Items
        </h2>
        <div className="overflow-x-auto rounded-lg border bg-background">
          <table className="w-full min-w-2xl text-left text-sm">
            <caption className="sr-only">Persisted order item snapshots</caption>
            <thead className="border-b bg-muted/50">
              <tr>
                <TableHeading>Product</TableHeading>
                <TableHeading>Variant</TableHeading>
                <TableHeading>Unit price</TableHeading>
                <TableHeading>Quantity</TableHeading>
                <TableHeading>Line total</TableHeading>
              </tr>
            </thead>
            <tbody className="divide-y">
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-4 font-semibold">{item.productNameSnapshot}</td>
                  <td className="px-4 py-4">{item.variantNameSnapshot}</td>
                  <td className="whitespace-nowrap px-4 py-4">
                    {formatMoney(item.unitPriceCentsSnapshot, order.currency)}
                  </td>
                  <td className="px-4 py-4">{item.quantity}</td>
                  <td className="whitespace-nowrap px-4 py-4 font-semibold">
                    {formatMoney(item.unitPriceCentsSnapshot * item.quantity, order.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section aria-labelledby="payment-heading" className="rounded-lg border bg-background p-6">
          <h2 className="font-bold text-xl" id="payment-heading">
            Stripe references
          </h2>
          <dl className="mt-4 space-y-4 text-sm">
            <ReferenceRow label="Checkout Session" value={order.stripeSessionId} />
            <ReferenceRow
              label="Payment Intent"
              value={order.stripePaymentIntentId ?? "Not recorded"}
            />
          </dl>
        </section>

        <section aria-labelledby="totals-heading" className="rounded-lg border bg-background p-6">
          <h2 className="font-bold text-xl" id="totals-heading">
            Totals
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            <TotalRow label="Subtotal" value={formatMoney(order.subtotalCents, order.currency)} />
            <TotalRow label="Shipping" value={formatMoney(order.shippingCents, order.currency)} />
            <TotalRow label="Tax" value={formatMoney(order.taxCents, order.currency)} />
            <div className="flex items-center justify-between border-t pt-3 font-bold text-base">
              <dt>Total</dt>
              <dd>{formatMoney(order.totalCents, order.currency)}</dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}

function TableHeading({ children }: { children: React.ReactNode }) {
  return (
    <th className="whitespace-nowrap px-4 py-3 font-semibold" scope="col">
      {children}
    </th>
  );
}

function ReferenceRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-all font-mono text-xs">{value}</dd>
    </div>
  );
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
