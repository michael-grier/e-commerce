import { z } from "zod";

const optionalString = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional(),
);

const optionalUrl = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().url().optional(),
);

const optionalIntegerString = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.coerce.number().int().nonnegative().optional(),
);

const envSchema = z.object({
  DATABASE_URL: optionalString,
  STRIPE_SECRET_KEY: optionalString,
  STRIPE_WEBHOOK_SECRET: optionalString,
  CLERK_SECRET_KEY: optionalString,
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: optionalString,
  RESEND_API_KEY: optionalString,
  EMAIL_FROM: optionalString,
  SUPPORT_EMAIL: optionalString,
  R2_ACCOUNT_ID: optionalString,
  R2_ACCESS_KEY_ID: optionalString,
  R2_SECRET_ACCESS_KEY: optionalString,
  R2_BUCKET: optionalString,
  R2_PUBLIC_URL: optionalUrl,
  SENTRY_DSN: optionalUrl,
  NEXT_PUBLIC_APP_URL: optionalUrl.default("http://localhost:3000"),
  ADMIN_USER_IDS: optionalString,
  SHIPPING_ALLOWED_COUNTRIES: optionalString.default("CA,US"),
  SHIPPING_STANDARD_RATE_CENTS: optionalIntegerString,
  SHIPPING_FREE_THRESHOLD_CENTS: optionalIntegerString,
});

const productionRequiredKeys = [
  "DATABASE_URL",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "CLERK_SECRET_KEY",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "SUPPORT_EMAIL",
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
  "R2_PUBLIC_URL",
  "NEXT_PUBLIC_APP_URL",
  "ADMIN_USER_IDS",
  "SHIPPING_STANDARD_RATE_CENTS",
  "SHIPPING_FREE_THRESHOLD_CENTS",
] as const;

export type Env = z.infer<typeof envSchema>;

export function parseEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);

  if (!parsed.success) {
    throw new Error(`Invalid environment variables: ${z.prettifyError(parsed.error)}`);
  }

  if (source.NODE_ENV === "production") {
    const missing = productionRequiredKeys.filter((key) => parsed.data[key] == null);

    if (missing.length > 0) {
      throw new Error(`Missing production environment variables: ${missing.join(", ")}`);
    }
  }

  return parsed.data;
}

export const env = parseEnv();
