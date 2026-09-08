# Early migration rollouts

These notes describe the original rollout boundaries. Later migrations change names and
constraints, so review the full applied migration sequence before considering a rollback.
Use the [migration runbook](README.md) for current deployment procedures.

## 0001

Migration `0001_sweet_zaladane` adds immutable line snapshots without rewriting existing pending
checkouts because their original Checkout names and prices cannot be reconstructed safely from the
mutable catalog. For a zero-overlap rollout, pause new Checkout creation, apply the migration, let
pre-deployment Checkout Sessions expire, up to one hour, deploy the application, and then resume
Checkout. If a legacy Session is paid during rollout, its webhook fails explicitly for manual
Stripe reconciliation instead of recording potentially incorrect receipt lines.

## 0002

Migration `0002_chubby_grandmaster` adds the inventory allocation state and fulfillment constraint.
Its non-null `allocated` default safely backfills existing orders. Deploy the migration before this
application version; for rollback, deploy the previous application first, then remove the
constraint, column, and enum after confirming no inventory-exception orders require reconciliation.

## 0004

Migration `0004_chilly_talisman.sql` adds the confirmation-email delivery outbox. Apply and verify it
on a disposable database branch before deployment, then run it before deploying code that creates
paid orders. Existing orders are backfilled as `failed` with the non-sensitive
`legacy_delivery_unknown` code so the scheduler does not unexpectedly email historical customers;
an administrator may explicitly retry one after checking its delivery history. To roll back, deploy
the previous application first, then use a reviewed follow-up migration to drop
`order_confirmation_deliveries` and `confirmation_delivery_status`. Migration 0008 later
renames both. Rolling back removes retry history but does not alter orders or payments.

## 0008

Migration `0008_local-pickup-fulfillment.sql` adds local pickup. It renames that outbox from
`order_confirmation_deliveries` to `order_email_deliveries` and its status enum to
`order_email_delivery_status` because the table now carries the pickup-ready email as well as the
confirmation, keyed by a new `kind` column. The rename preserves every existing row and its
delivery history. It also adds the `ready_for_pickup` order status and the `fulfillment_method`
columns on `orders` and `pending_checkouts`, both defaulting to `shipping` so existing orders are
unaffected. Apply and verify it on a disposable database branch before deployment. To roll back,
deploy the previous application first, then use a reviewed follow-up migration that reverses the
renames; note that Postgres cannot remove the `ready_for_pickup` enum value, so leave it in place.

## 0012

Migration `0012_local-delivery.sql` converts local pickup into local delivery. At that rollout,
local pickup had not been enabled in production. It renames the `pickup` fulfillment method to `delivery`, the
`ready_for_pickup` order status to `delivery_scheduled`, the `pickup_ready` email kind to
`delivery_scheduled`, and the `orders.ready_for_pickup_at` column to `delivery_scheduled_at`,
recreating the three check constraints that referenced the old status text. Enum value renames
rewrite stored rows in place, so any staged pickup orders become scheduled deliveries. To roll
back, deploy the previous application first, then reverse the renames with a reviewed follow-up
migration.
