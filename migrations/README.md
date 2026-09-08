# Migration runbook

Executable SQL and Drizzle metadata live in [drizzle/](../drizzle/). This folder contains rollout,
backfill, and rollback notes. Add a note for migrations with a backfill, compatibility constraint,
guard, or nontrivial rollback.

Per-migration notes describe the schema at that migration's original release. Later migrations
may change names, constraints, and rollback compatibility. Read the full applied sequence before
using an old rollback procedure; current schema definitions live in [schema.ts](../lib/db/schema.ts).

## Deployment

On pushes to `main`, the [Ship main workflow](../.github/workflows/deploy-production.yml):

1. Checks that `PRODUCTION_DATABASE_URL` matches `PRODUCTION_NEON_ENDPOINT_ID`.
2. Applies pending migrations to production with `bun run db:migrate`.
3. Deploys the same commit through the Vercel CLI only after the production migration job succeeds.
   The Vercel build checks its own pooled `DATABASE_URL` against the expected endpoint too.
4. Independently migrates the shared dev database using `DEV_DATABASE_URL`. Failure in this job
   does not block the production deploy and needs separate attention.

The workflow serializes production runs without cancelling an in-flight run. A newer queued commit
can replace an older queued commit and includes its migrations. `vercel.json` disables git-driven
production deployment of `main` so it cannot bypass migration ordering.

Workflow logs record pending migrations and their result. Re-running the migrator skips migrations
already applied. A failed migration blocks deployment, but do not assume the database is unchanged:
inspect the log and migration ledger before recovery. A deployment failure after successful
migration leaves the previous application running against the new schema.

### Configuration

Keep these values in GitHub Actions secrets:

| Secret | Purpose |
| --- | --- |
| `PRODUCTION_DATABASE_URL` | Direct connection to the production Neon database |
| `DEV_DATABASE_URL` | Connection to the shared dev database |
| `VERCEL_TOKEN` | Deploy token |
| `VERCEL_ORG_ID` | Vercel team ID |
| `VERCEL_PROJECT_ID` | Vercel project ID |

Set the repository variable `PRODUCTION_NEON_ENDPOINT_ID` and the same Production-only value in
Vercel. The guard compares the non-secret endpoint ID after removing Neon's pooling suffix.
The application build uses Vercel's environment configuration.

Worktree databases are provisioned and migrated by `bun run setup:worktree`; see
[worktree setup](../README.md#git-worktrees). Verify isolation before running migrations locally.
Production migrations go through the workflow, never a developer's shell or automated test.

## Failed or guarded migrations

1. Read the failed job log and determine which migration and guard failed. For example, 0011
   refuses to guess a product subcategory.
2. Review the specific migration's preflight notes. Resolve the cause through a reviewed change
   or explicitly authorized data correction; preserve financial records and migration guards.
3. Confirm the recovery is compatible with the schema and application still serving traffic.
4. After the correction, rerun the failed workflow or dispatch it on `main`. Dispatching another
   ref cannot migrate or deploy production.

Migration 0011's stored SQL error refers to `docs/migrations/0011-product-subcategories.md`.
That note is now [0011-product-subcategories.md](0011-product-subcategories.md). The historical SQL
is unchanged so a documentation move does not alter recorded migration contents.

## Compatibility and rollback

Migrations run while the previous application may still serve requests. For incompatible changes,
use separate releases:

1. Expand with compatible columns or tables, backfill, and deploy code that supports the transition.
2. Once incompatible writers and rollback targets are retired, enforce constraints or remove old
   columns in a later migration.

Check new constraints against existing rows and old writers before deployment. Application rollback
does not reverse SQL. Review both the migration being reverted and every later migration that
relies on it; some changes require a forward fix instead. Preserve order, payment, reservation,
and email-delivery history during recovery.

## Rollout notes

- [0001, 0002, 0004, 0008, 0012: early snapshots, inventory, outbox, and fulfillment](early-rollouts.md)
- [0003: payment lifecycle](0003-payment-lifecycle.md)
- [0005: inventory reservations](0005-inventory-reservations.md)
- [0006: product categories](0006-product-categories.md)
- [0011: product subcategories](0011-product-subcategories.md)
- [0013: shipping profiles](0013-shipping-profiles.md)
- [0015: refunded inventory release](0015-refunded-inventory-release.md)
- [0016 and 0018: manual delivery review](0016-manual-delivery-review.md)
- [0017: destination province](0017-destination-province.md)
- [0019: refund email outbox](0019-refund-email-outbox.md)
- [0020: admin new-order email](0020-admin-new-order-email.md)
