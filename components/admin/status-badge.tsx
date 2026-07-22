import { Badge } from "@/components/ui/badge";
import type { Order, Product } from "@/lib/db/schema";

const productStatusStyles: Record<Product["status"], string> = {
  active: "border-emerald-200 bg-emerald-50 text-emerald-800",
  draft: "border-border bg-muted text-muted-foreground",
  archived: "border-border bg-background text-muted-foreground",
};

const orderStatusStyles: Record<Order["status"], string> = {
  pending: "border-border bg-background text-muted-foreground",
  paid: "border-amber-200 bg-amber-50 text-amber-900",
  fulfilled: "border-emerald-200 bg-emerald-50 text-emerald-800",
  cancelled: "border-red-200 bg-red-50 text-red-800",
  refunded: "border-border bg-muted text-muted-foreground",
};

const orderStatusLabels: Record<Order["status"], string> = {
  pending: "Pending",
  paid: "Paid",
  fulfilled: "Shipped",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

const orderInventoryStatusStyles: Record<Order["inventoryStatus"], string> = {
  allocated: "border-emerald-200 bg-emerald-50 text-emerald-800",
  exception: "border-red-200 bg-red-50 text-red-800",
};

const orderInventoryStatusLabels: Record<Order["inventoryStatus"], string> = {
  allocated: "Allocated",
  exception: "Inventory exception",
};

const refundStatusStyles: Record<Order["refundStatus"], string> = {
  none: "border-border bg-background text-muted-foreground",
  partial: "border-orange-200 bg-orange-50 text-orange-900",
  full: "border-border bg-muted text-muted-foreground",
};

const refundStatusLabels: Record<Order["refundStatus"], string> = {
  none: "Not refunded",
  partial: "Partially refunded",
  full: "Fully refunded",
};

const disputeStatusStyles: Record<Order["disputeStatus"], string> = {
  none: "border-border bg-background text-muted-foreground",
  open: "border-red-200 bg-red-50 text-red-800",
  won: "border-emerald-200 bg-emerald-50 text-emerald-800",
  lost: "border-red-200 bg-red-50 text-red-800",
  prevented: "border-red-200 bg-red-50 text-red-800",
};

const disputeStatusLabels: Record<Order["disputeStatus"], string> = {
  none: "No dispute",
  open: "Dispute open",
  won: "Dispute won",
  lost: "Dispute lost",
  prevented: "Dispute prevented",
};

function formatStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function ProductStatusBadge({ status }: { status: Product["status"] }) {
  return (
    <Badge className={productStatusStyles[status]} variant="outline">
      {formatStatus(status)}
    </Badge>
  );
}

export function OrderStatusBadge({ status }: { status: Order["status"] }) {
  return (
    <Badge className={orderStatusStyles[status]} variant="outline">
      {orderStatusLabels[status]}
    </Badge>
  );
}

export function OrderInventoryStatusBadge({ status }: { status: Order["inventoryStatus"] }) {
  return (
    <Badge className={orderInventoryStatusStyles[status]} variant="outline">
      {orderInventoryStatusLabels[status]}
    </Badge>
  );
}

export function RefundStatusBadge({ status }: { status: Order["refundStatus"] }) {
  return (
    <Badge className={refundStatusStyles[status]} variant="outline">
      {refundStatusLabels[status]}
    </Badge>
  );
}

export function DisputeStatusBadge({ status }: { status: Order["disputeStatus"] }) {
  return (
    <Badge className={disputeStatusStyles[status]} variant="outline">
      {disputeStatusLabels[status]}
    </Badge>
  );
}
