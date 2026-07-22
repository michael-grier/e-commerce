CREATE TYPE "public"."dispute_status" AS ENUM('none', 'open', 'won', 'lost', 'prevented');--> statement-breakpoint
CREATE TYPE "public"."refund_status" AS ENUM('none', 'partial', 'full');--> statement-breakpoint
CREATE TYPE "public"."stripe_payment_event_kind" AS ENUM('refund', 'dispute');--> statement-breakpoint
CREATE TABLE "stripe_payment_events" (
	"stripe_event_id" text PRIMARY KEY NOT NULL,
	"stripe_payment_intent_id" text NOT NULL,
	"kind" "stripe_payment_event_kind" NOT NULL,
	"refunded_cents" integer,
	"currency" text,
	"dispute_status" "dispute_status",
	"occurred_at" timestamp with time zone NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stripe_payment_events_refunded_cents_nonnegative" CHECK ("stripe_payment_events"."refunded_cents" IS NULL OR "stripe_payment_events"."refunded_cents" >= 0)
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "refund_status" "refund_status" DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "refunded_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "dispute_status" "dispute_status" DEFAULT 'none' NOT NULL;--> statement-breakpoint
CREATE INDEX "stripe_payment_events_payment_intent_idx" ON "stripe_payment_events" USING btree ("stripe_payment_intent_id");--> statement-breakpoint
CREATE INDEX "stripe_payment_events_occurred_at_idx" ON "stripe_payment_events" USING btree ("occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_stripe_payment_intent_id_unique" ON "orders" USING btree ("stripe_payment_intent_id");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_refunded_cents_nonnegative" CHECK ("orders"."refunded_cents" >= 0);--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_refunded_cents_not_above_total" CHECK ("orders"."refunded_cents" <= "orders"."total_cents");