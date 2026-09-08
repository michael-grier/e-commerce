# Payment lifecycle migration 0003

`0003_long_boomerang.sql` adds explicit refund and dispute state to orders, a durable
Stripe payment-event ledger, and a unique lookup for non-null Stripe Payment Intent IDs.

## Deployment

1. Before applying the migration, verify that existing non-null Payment Intent IDs are unique:

   ```sql
   SELECT stripe_payment_intent_id, COUNT(*)
   FROM orders
   WHERE stripe_payment_intent_id IS NOT NULL
   GROUP BY stripe_payment_intent_id
   HAVING COUNT(*) > 1;
   ```

   Resolve any returned rows against Stripe records before continuing. Do not delete or merge
   orders automatically.

2. Apply the migration before deploying code that writes payment lifecycle events.
3. Configure the existing Stripe webhook endpoint to deliver `charge.refunded` and the
   `charge.dispute.created`, `charge.dispute.updated`, `charge.dispute.closed`,
   `charge.dispute.funds_withdrawn`, and `charge.dispute.funds_reinstated` lifecycle events in
   addition to the Checkout events. Do not test this change with live refunds or disputes.
4. Replay recent relevant Stripe events after deployment if refunds or disputes may have occurred
   before this capability existed.

The new order columns use safe defaults (`none` and `0`), so existing paid orders need no database
backfill. Historical refund and dispute truth cannot be inferred locally; event replay is the
backfill mechanism.

## Rollback

The previous application version ignores the additive columns and table, so application rollback
does not require an immediate database rollback. Keep the ledger during incident response so
events received by the new version are not lost.

If a database rollback is later required, first stop lifecycle-event writes, preserve the
`stripe_payment_events` rows, then drop the Payment Intent unique index, event table, order checks
and columns, followed by the three new enum types. Dropping the ledger or columns destroys refund
and dispute history; reconcile affected orders against Stripe before restoring fulfillment.
