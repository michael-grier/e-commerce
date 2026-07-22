CREATE TYPE "public"."order_inventory_status" AS ENUM('allocated', 'exception');--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "inventory_status" "order_inventory_status" DEFAULT 'allocated' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_fulfilled_inventory_allocated" CHECK ("orders"."status" <> 'fulfilled' OR "orders"."inventory_status" = 'allocated');