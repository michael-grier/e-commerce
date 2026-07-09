import { formatMoney } from "@/lib/money";

type PriceProps = {
  cents: number | null;
  maxCents?: number | null;
};

export function Price({ cents, maxCents }: PriceProps) {
  if (cents == null) {
    return <span className="text-muted-foreground">Price unavailable</span>;
  }

  if (maxCents != null && maxCents !== cents) {
    return (
      <span>
        {formatMoney(cents)}
        <span className="text-muted-foreground"> - {formatMoney(maxCents)}</span>
      </span>
    );
  }

  return <span>{formatMoney(cents)}</span>;
}
