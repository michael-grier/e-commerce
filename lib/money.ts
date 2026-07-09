const centsFormatterCache = new Map<string, Intl.NumberFormat>();

function assertCents(cents: number): void {
  if (!Number.isSafeInteger(cents)) {
    throw new Error("Money amounts must be safe integer cents.");
  }
}

function formatterFor(currency: string, locale: string): Intl.NumberFormat {
  const key = `${locale}:${currency.toUpperCase()}`;
  const cached = centsFormatterCache.get(key);

  if (cached) {
    return cached;
  }

  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency.toUpperCase(),
  });

  centsFormatterCache.set(key, formatter);
  return formatter;
}

export function formatMoney(cents: number, currency = "CAD", locale = "en-CA"): string {
  assertCents(cents);

  return formatterFor(currency, locale).format(cents / 100);
}

export function centsToDollars(cents: number): string {
  assertCents(cents);

  const sign = cents < 0 ? "-" : "";
  const absoluteCents = Math.abs(cents);
  const dollars = Math.floor(absoluteCents / 100);
  const remainder = String(absoluteCents % 100).padStart(2, "0");

  return `${sign}${dollars}.${remainder}`;
}

export function dollarsToCents(input: string | number): number {
  const normalized = String(input).trim().replace(/[$,]/g, "");
  const match = /^(-)?(\d+)(?:\.(\d{0,2}))?$/.exec(normalized);

  if (!match) {
    throw new Error("Money input must be a non-negative dollar amount with at most two decimals.");
  }

  const [, sign, dollarsInput, centsInput] = match;

  if (sign) {
    throw new Error("Money input cannot be negative.");
  }

  const dollars = Number.parseInt(dollarsInput, 10);
  const cents = Number.parseInt((centsInput ?? "").padEnd(2, "0"), 10);
  const total = dollars * 100 + cents;

  assertCents(total);
  return total;
}
