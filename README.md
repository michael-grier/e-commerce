# Skate Shop

Custom e-commerce app for a low-volume skate shop. The architecture prioritizes hosted payments,
guest checkout, server-authoritative pricing, and a small maintainable admin surface.

## Stack

- Next.js 15 App Router
- Bun for local scripts
- Node runtime on Vercel Pro
- Neon Postgres with Drizzle ORM and drizzle-zod
- Clerk for admin-only authentication
- Stripe hosted Checkout and Stripe Tax
- Cloudflare R2 for direct product image uploads
- shadcn/ui-style components with Tailwind CSS
- Zustand and localStorage for cart state
- Resend, React Email, Sentry, and Biome

## Architecture Summary

- The client cart stores purchase intent and display snapshots only.
- Checkout re-reads product prices and inventory from Postgres.
- Stripe owns payment, tax, and hosted payment UI.
- Orders are created only by the verified Stripe webhook after payment.
- Paid order creation snapshots items and conditionally decrements inventory in one transaction.
- `pending_checkouts` bridges Checkout Session creation to the webhook with a short metadata token
  instead of storing cart JSON directly in Stripe metadata.
- Admin access uses Clerk authentication plus an `ADMIN_USER_IDS` allowlist.

## Local Setup

1. Install dependencies:

   ```bash
   bun install
   ```

2. Copy the example environment file:

   ```bash
   cp .env.example .env.local
   ```

3. Start the app:

   ```bash
   bun run dev
   ```

   Creating a hosted Checkout Session also requires a Stripe test secret plus the shipping rate,
   free-shipping threshold, allowed countries, and app URL values documented in `.env.example`.
   Keep `STRIPE_TAX_ENABLED=false` until Stripe Tax is configured, then enable it for production.

4. Run checks:

   ```bash
   bun run lint
   bun run typecheck
   bun run build
   ```

## Database

The Drizzle schema lives in `lib/db/schema.ts`, and generated migrations live in `drizzle/`.

```bash
bun run db:generate
bun run db:migrate
bun run db:seed
```

`db:migrate` and `db:seed` require `DATABASE_URL`. The seed script is intended for local or
development databases.

## Stripe Webhooks

Forward sandbox webhook events to the local raw-body endpoint while developing:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Store the listener's `whsec_...` signing secret as `STRIPE_WEBHOOK_SECRET` in `.env.local`.
Verified paid Checkout events create one order, snapshot its items, conditionally decrement
inventory in the same transaction, and mark the pending checkout completed.

Order confirmations use the persisted order and item snapshots after that transaction commits.
Configure `RESEND_API_KEY`, `EMAIL_FROM`, and `SUPPORT_EMAIL` to enable delivery. Resend failures
are reported separately and do not make a successfully persisted Stripe webhook fail.

## Admin Authentication

The `/admin` route requires a Clerk development session and a matching Clerk user ID in the
comma-separated `ADMIN_USER_IDS` allowlist. Configure `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`,
`CLERK_SECRET_KEY`, and `ADMIN_USER_IDS` in `.env.local`. Middleware requires authentication, and
the admin server layout independently calls `requireAdmin()` before rendering protected content.
Read-only admin pages are available at `/admin/products` and `/admin/orders`; their database query
helpers also call `requireAdmin()` before reading catalog or order data.

## Cloudflare R2 Product Images

Create an R2 bucket and an Object Read & Write API token scoped to that bucket. Set the five
`R2_*` values documented in `.env.example`; `R2_PUBLIC_URL` must be the bucket's public development
URL or custom-domain base URL, not its S3 API endpoint. Restart the app after changing environment
values.

Browser uploads use a short-lived presigned `PUT` URL and go directly to R2. Configure the bucket's
CORS policy to allow the storefront origin, the `PUT` method, and the `Content-Type` header. For
local development, a minimal policy is:

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Add the production app origin before deployment. See Cloudflare's documentation for
[S3 API tokens](https://developers.cloudflare.com/r2/api/tokens/),
[presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/), and
[bucket CORS policies](https://developers.cloudflare.com/r2/buckets/cors/).

## Sentry Error Monitoring

Create a Sentry Next.js project and set `SENTRY_DSN` plus `NEXT_PUBLIC_SENTRY_DSN` to the same
project DSN. The public DSN is an ingest address, not an authentication secret. Error monitoring is
disabled when the corresponding DSN is absent and in the test environment.

The initial configuration collects errors only: tracing, session replay, Sentry logs, and default
PII collection are disabled. Server code should use `captureServerException()` with stable area and
operation labels; do not attach customer details, request bodies, payment data, or secrets.

Readable production stack traces additionally require `SENTRY_ORG`, `SENTRY_PROJECT`, and a secret
`SENTRY_AUTH_TOKEN` in the deployment environment. Source-map generation and upload remain disabled
when the auth token is absent. Never expose `SENTRY_AUTH_TOKEN` through a `NEXT_PUBLIC_*` variable.

## Commit Checkpoints

This build should be committed in small checkpoints:

1. Scaffold and project foundations.
2. Drizzle schema, migrations, validators, and pending checkout contract.
3. Public catalog, product detail, and cart.
4. Stripe Checkout, webhook, order persistence, inventory, and email.
5. Admin auth, product/order management, and R2 uploads.
6. Sentry, testing, QA checklist, and deployment docs.
