-- ============================================================================
-- ORDERS SYSTEM
-- ============================================================================
CREATE TABLE "orders" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL REFERENCES "users"("id"),
    "restaurant_id" uuid NOT NULL REFERENCES "restaurants"("id"),
    "address_id" uuid NOT NULL REFERENCES "addresses"("id"),
    "status" text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','preparing','ready','picked_up','out_for_delivery','delivered','cancelled','rejected')),
    "subtotal" integer NOT NULL,
    "delivery_fee" integer NOT NULL DEFAULT 0,
    "taxes" integer NOT NULL DEFAULT 0,
    "discount" integer NOT NULL DEFAULT 0,
    "total" integer NOT NULL,
    "coupon_code" text,
    "payment_method" text NOT NULL DEFAULT 'card',
    "special_instructions" text,
    "estimated_delivery_time" timestamp,
    "actual_delivery_time" timestamp,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "order_items" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "order_id" uuid NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
    "menu_item_id" uuid NOT NULL REFERENCES "menu_items"("id"),
    "item_name" text NOT NULL,
    "variant_name" text,
    "quantity" integer NOT NULL DEFAULT 1,
    "price_per_unit" integer NOT NULL,
    "addons_json" jsonb DEFAULT '[]',
    "created_at" timestamp DEFAULT now() NOT NULL
);

-- ============================================================================
-- DELIVERY AGENTS SYSTEM
-- ============================================================================
CREATE TABLE "delivery_agents" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL UNIQUE REFERENCES "users"("id"),
    "name" text NOT NULL,
    "phone_number" text NOT NULL,
    "vehicle_type" text NOT NULL DEFAULT 'bike' CHECK (vehicle_type IN ('bike','scooter','car','bicycle')),
    "is_available" boolean DEFAULT true NOT NULL,
    "current_latitude" double precision,
    "current_longitude" double precision,
    "rating" double precision DEFAULT 5.0,
    "total_deliveries" integer DEFAULT 0,
    "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "delivery_assignments" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "order_id" uuid NOT NULL UNIQUE REFERENCES "orders"("id"),
    "agent_id" uuid NOT NULL REFERENCES "delivery_agents"("id"),
    "status" text NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned','accepted','picked_up','delivered','cancelled')),
    "pickup_time" timestamp,
    "delivery_time" timestamp,
    "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX "idx_orders_user_id" ON "orders"("user_id");
CREATE INDEX "idx_orders_restaurant_id" ON "orders"("restaurant_id");
CREATE INDEX "idx_orders_status" ON "orders"("status");
CREATE INDEX "idx_delivery_agents_available" ON "delivery_agents"("is_available");
CREATE INDEX "idx_delivery_assignments_agent" ON "delivery_assignments"("agent_id");