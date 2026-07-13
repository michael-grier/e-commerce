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

## Commit Checkpoints

This build should be committed in small checkpoints:

1. Scaffold and project foundations.
2. Drizzle schema, migrations, validators, and pending checkout contract.
3. Public catalog, product detail, and cart.
4. Stripe Checkout, webhook, order persistence, inventory, and email.
5. Admin auth, product/order management, and R2 uploads.
6. Sentry, testing, QA checklist, and deployment docs.
