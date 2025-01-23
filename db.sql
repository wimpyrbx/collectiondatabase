-- Backup created at 2025-01-23 12:40:36

BEGIN;

-- ============================
-- FUNCTIONS
-- ============================
DROP FUNCTION IF EXISTS calculate_nok_prices() CASCADE;

CREATE OR REPLACE FUNCTION calculate_nok_prices()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
VOLATILE AS
$function$

BEGIN
    -- Calculate standard price in NOK
    IF NEW.price_usd IS NOT NULL THEN
        NEW.price_nok := NEW.price_usd * (SELECT rate FROM currency_rates ORDER BY updated_at DESC LIMIT 1);
        NEW.price_nok_fixed := ROUND(NEW.price_nok / 10) * 10;  -- Round to nearest 10
    END IF;

    -- Calculate new price in NOK if price_new_usd is set
    IF NEW.price_new_usd IS NOT NULL THEN
        NEW.price_new_nok := NEW.price_new_usd * (SELECT rate FROM currency_rates ORDER BY updated_at DESC LIMIT 1);
        NEW.price_new_nok_fixed := ROUND(NEW.price_new_nok / 10) * 10;  -- Round to nearest 10
    END IF;

    RETURN NEW;
END;

$function$;

GRANT EXECUTE ON FUNCTION calculate_nok_prices() TO authenticated;

GRANT EXECUTE ON FUNCTION calculate_nok_prices() TO anon;

GRANT EXECUTE ON FUNCTION calculate_nok_prices() TO service_role;

DROP FUNCTION IF EXISTS cleanup_invalid_inventory_attribute_values(p_attribute_id integer, p_attribute_type character varying, p_allowed_values text[]) CASCADE;

CREATE OR REPLACE FUNCTION cleanup_invalid_inventory_attribute_values(p_attribute_id integer, p_attribute_type character varying, p_allowed_values text[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE AS
$function$

BEGIN
  -- Delete values that don't match the new type constraints
  DELETE FROM attributes_inventory_values
  WHERE attribute_id = p_attribute_id
    AND (
      -- For boolean type, only allow 'true' or 'false'
      (p_attribute_type = 'boolean' AND value NOT IN ('true', 'false'))
      -- For set type, only allow values from the allowed set
      OR (p_attribute_type = 'set' AND p_allowed_values IS NOT NULL AND value != ALL(p_allowed_values))
      -- For number type, ensure value is numeric
      OR (p_attribute_type = 'number' AND value !~ '^[0-9]+\.?[0-9]*$')
    );
END;

$function$;

GRANT EXECUTE ON FUNCTION cleanup_invalid_inventory_attribute_values(p_attribute_id integer, p_attribute_type character varying, p_allowed_values text[]) TO authenticated;

GRANT EXECUTE ON FUNCTION cleanup_invalid_inventory_attribute_values(p_attribute_id integer, p_attribute_type character varying, p_allowed_values text[]) TO anon;

GRANT EXECUTE ON FUNCTION cleanup_invalid_inventory_attribute_values(p_attribute_id integer, p_attribute_type character varying, p_allowed_values text[]) TO service_role;

DROP FUNCTION IF EXISTS cleanup_invalid_product_attributes(p_attribute_id integer, p_product_group_ids integer[], p_product_type character varying) CASCADE;

CREATE OR REPLACE FUNCTION cleanup_invalid_product_attributes(p_attribute_id integer, p_product_group_ids integer[], p_product_type character varying)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE AS
$function$

BEGIN
  -- Delete attribute values for products that no longer match the applicability rules
  DELETE FROM attributes_product_values apv
  USING products p
  WHERE apv.attribute_id = p_attribute_id
    AND apv.product_id = p.id
    AND (
      p.product_group_id != ALL(p_product_group_ids)
      OR (p_product_type IS NOT NULL AND p.product_type != p_product_type)
    );
END;

$function$;

GRANT EXECUTE ON FUNCTION cleanup_invalid_product_attributes(p_attribute_id integer, p_product_group_ids integer[], p_product_type character varying) TO authenticated;

GRANT EXECUTE ON FUNCTION cleanup_invalid_product_attributes(p_attribute_id integer, p_product_group_ids integer[], p_product_type character varying) TO anon;

GRANT EXECUTE ON FUNCTION cleanup_invalid_product_attributes(p_attribute_id integer, p_product_group_ids integer[], p_product_type character varying) TO service_role;

DROP FUNCTION IF EXISTS exec_sql(query text, table_name text) CASCADE;

CREATE OR REPLACE FUNCTION exec_sql(query text, table_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
VOLATILE AS
$function$

BEGIN
    -- Function logic goes here
    RETURN 'SQL execution successful';
END;

$function$;

GRANT EXECUTE ON FUNCTION exec_sql(query text, table_name text) TO authenticated;

GRANT EXECUTE ON FUNCTION exec_sql(query text, table_name text) TO anon;

GRANT EXECUTE ON FUNCTION exec_sql(query text, table_name text) TO service_role;

DROP FUNCTION IF EXISTS extract_variant(title text) CASCADE;

CREATE OR REPLACE FUNCTION extract_variant(title text)
RETURNS TABLE(name text, variant text)
LANGUAGE plpgsql
SECURITY INVOKER
VOLATILE AS
$function$

BEGIN
    IF title ~ '\((.*?)\)$' THEN
        RETURN QUERY 
        SELECT 
            trim(substring(title from '^(.*?)\s*\(.*\)$')),
            trim(substring(title from '\((.*?)\)$'));
    ELSE
        RETURN QUERY 
        SELECT title, NULL::text;
    END IF;
END;

$function$;

GRANT EXECUTE ON FUNCTION extract_variant(title text) TO authenticated;

GRANT EXECUTE ON FUNCTION extract_variant(title text) TO anon;

GRANT EXECUTE ON FUNCTION extract_variant(title text) TO service_role;

DROP FUNCTION IF EXISTS get_index_definitions() CASCADE;

CREATE OR REPLACE FUNCTION get_index_definitions()
RETURNS TABLE(tablename text, indexname text, indexdef text)
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE AS
$function$

BEGIN
    RETURN QUERY
    SELECT 
        i.tablename::text,
        i.indexname::text,
        i.indexdef::text
    FROM pg_indexes i
    WHERE i.schemaname = 'public'
    ORDER BY i.tablename, i.indexname;
END;

$function$;

GRANT EXECUTE ON FUNCTION get_index_definitions() TO authenticated;

GRANT EXECUTE ON FUNCTION get_index_definitions() TO anon;

GRANT EXECUTE ON FUNCTION get_index_definitions() TO service_role;

DROP FUNCTION IF EXISTS get_table_schema(p_table_name text) CASCADE;

CREATE OR REPLACE FUNCTION get_table_schema(p_table_name text)
RETURNS TABLE(column_name text, data_type text, is_nullable text, column_default text, character_maximum_length numeric, debug_info text)
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE AS
$function$

BEGIN
    -- First check if the table exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = p_table_name
    ) THEN
        RETURN QUERY SELECT 
            NULL::text,
            NULL::text,
            NULL::text,
            NULL::text,
            NULL::numeric,
            'Table not found in public schema'::text;
        RETURN;
    END IF;

    RETURN QUERY
    SELECT 
        c.column_name::text,
        c.data_type::text,
        c.is_nullable::text,
        c.column_default::text,
        c.character_maximum_length::numeric,
        'Found table and columns'::text
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
    AND c.table_name = p_table_name
    ORDER BY c.ordinal_position;

    -- If no rows were returned but table exists
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            NULL::text,
            NULL::text,
            NULL::text,
            NULL::text,
            NULL::numeric,
            'Table exists but no columns found'::text;
    END IF;
END;

$function$;

GRANT EXECUTE ON FUNCTION get_table_schema(p_table_name text) TO authenticated;

GRANT EXECUTE ON FUNCTION get_table_schema(p_table_name text) TO anon;

GRANT EXECUTE ON FUNCTION get_table_schema(p_table_name text) TO service_role;

DROP FUNCTION IF EXISTS get_trigger_definitions() CASCADE;

CREATE OR REPLACE FUNCTION get_trigger_definitions()
RETURNS TABLE(trigger_name text, table_name text, trigger_definition text, trigger_procedure text)
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE AS
$function$

BEGIN
    RETURN QUERY
    SELECT 
        tg.tgname::text as trigger_name,
        cl.relname::text as table_name,
        pg_get_triggerdef(tg.oid)::text as trigger_definition,
        p.proname::text as trigger_procedure
    FROM pg_trigger tg
    JOIN pg_class cl ON cl.oid = tg.tgrelid
    JOIN pg_proc p ON p.oid = tg.tgfoid
    JOIN pg_namespace n ON n.oid = cl.relnamespace
    WHERE n.nspname = 'public'
    AND NOT tg.tgisinternal;  -- Skip internal triggers
END;

$function$;

GRANT EXECUTE ON FUNCTION get_trigger_definitions() TO authenticated;

GRANT EXECUTE ON FUNCTION get_trigger_definitions() TO anon;

GRANT EXECUTE ON FUNCTION get_trigger_definitions() TO service_role;

DROP FUNCTION IF EXISTS get_view_definitions() CASCADE;

CREATE OR REPLACE FUNCTION get_view_definitions()
RETURNS TABLE(viewname text, definition text)
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE AS
$function$

BEGIN
    RETURN QUERY
    SELECT 
        v.viewname::text,
        pg_get_viewdef(c.oid, true)::text as definition
    FROM pg_catalog.pg_views v
    JOIN pg_catalog.pg_class c ON c.relname = v.viewname
    WHERE v.schemaname = 'public'
    ORDER BY v.viewname;
END;

$function$;

GRANT EXECUTE ON FUNCTION get_view_definitions() TO authenticated;

GRANT EXECUTE ON FUNCTION get_view_definitions() TO anon;

GRANT EXECUTE ON FUNCTION get_view_definitions() TO service_role;

DROP FUNCTION IF EXISTS handle_add_to_sale() CASCADE;

CREATE OR REPLACE FUNCTION handle_add_to_sale()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
VOLATILE AS
$function$

DECLARE
    sold_price_to_insert numeric;
BEGIN
    IF OLD.inventory_status != 'For Sale' THEN
        RAISE EXCEPTION 'Can only add items with "For Sale" status to a sale';
    END IF;

    -- Get the final_price directly from view_inventory
    SELECT vi.final_price INTO sold_price_to_insert
    FROM view_inventory vi
    WHERE vi.inventory_id = NEW.id;

    IF sold_price_to_insert IS NULL THEN
        RAISE EXCEPTION 'Cannot determine sold price for this item. Final price is NULL.';
    END IF;

    INSERT INTO sale_items (sale_id, inventory_id, sold_price)
    VALUES (NEW.sale_id, NEW.id, sold_price_to_insert);

    NEW.inventory_status := 'Sold';
    RETURN NEW;
END;

$function$;

GRANT EXECUTE ON FUNCTION handle_add_to_sale() TO authenticated;

GRANT EXECUTE ON FUNCTION handle_add_to_sale() TO anon;

GRANT EXECUTE ON FUNCTION handle_add_to_sale() TO service_role;

DROP FUNCTION IF EXISTS handle_inventory_delete() CASCADE;

CREATE OR REPLACE FUNCTION handle_inventory_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
VOLATILE AS
$function$

BEGIN
    IF OLD.inventory_status = 'Sold' THEN
        RAISE EXCEPTION 'Cannot delete inventory item that is marked as Sold';
    END IF;
    RETURN OLD;
END;

$function$;

GRANT EXECUTE ON FUNCTION handle_inventory_delete() TO authenticated;

GRANT EXECUTE ON FUNCTION handle_inventory_delete() TO anon;

GRANT EXECUTE ON FUNCTION handle_inventory_delete() TO service_role;

DROP FUNCTION IF EXISTS handle_inventory_status_change() CASCADE;

CREATE OR REPLACE FUNCTION handle_inventory_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
VOLATILE AS
$function$

BEGIN
  IF OLD.inventory_status <> NEW.inventory_status THEN
    INSERT INTO inventory_status_tracking (inventory_id, sale_id)
    VALUES (NEW.id, NEW.sale_id);
  END IF;
  RETURN NEW;
END;

$function$;

GRANT EXECUTE ON FUNCTION handle_inventory_status_change() TO authenticated;

GRANT EXECUTE ON FUNCTION handle_inventory_status_change() TO anon;

GRANT EXECUTE ON FUNCTION handle_inventory_status_change() TO service_role;

DROP FUNCTION IF EXISTS handle_override_price_change() CASCADE;

CREATE OR REPLACE FUNCTION handle_override_price_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
VOLATILE AS
$function$

BEGIN
    IF OLD.inventory_status = 'Sold' THEN
        RAISE EXCEPTION 'Cannot update override price for an item with "Sold" status';
    END IF;
    RETURN NEW;
END;

$function$;

GRANT EXECUTE ON FUNCTION handle_override_price_change() TO authenticated;

GRANT EXECUTE ON FUNCTION handle_override_price_change() TO anon;

GRANT EXECUTE ON FUNCTION handle_override_price_change() TO service_role;

DROP FUNCTION IF EXISTS handle_remove_from_sale() CASCADE;

CREATE OR REPLACE FUNCTION handle_remove_from_sale()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
VOLATILE AS
$function$

BEGIN
    IF OLD.inventory_status = 'Sold' THEN
        NEW.inventory_status := 'For Sale';
        DELETE FROM sale_items WHERE inventory_id = OLD.id;
    END IF;
    RETURN NEW;
END;

$function$;

GRANT EXECUTE ON FUNCTION handle_remove_from_sale() TO authenticated;

GRANT EXECUTE ON FUNCTION handle_remove_from_sale() TO anon;

GRANT EXECUTE ON FUNCTION handle_remove_from_sale() TO service_role;

DROP FUNCTION IF EXISTS list_all_tables() CASCADE;

CREATE OR REPLACE FUNCTION list_all_tables()
RETURNS TABLE(schema_name text, table_name text, table_type text)
LANGUAGE plpgsql
SECURITY INVOKER
VOLATILE AS
$function$

BEGIN
    RETURN QUERY
    SELECT 
        table_schema::text,
        tables.table_name::text,
        tables.table_type::text
    FROM information_schema.tables
    WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
    ORDER BY table_schema, table_name;
END;

$function$;

GRANT EXECUTE ON FUNCTION list_all_tables() TO authenticated;

GRANT EXECUTE ON FUNCTION list_all_tables() TO anon;

GRANT EXECUTE ON FUNCTION list_all_tables() TO service_role;

DROP FUNCTION IF EXISTS update_all_product_prices() CASCADE;

CREATE OR REPLACE FUNCTION update_all_product_prices()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
VOLATILE AS
$function$
BEGIN
    -- Update all product prices when exchange rate changes
    UPDATE products 
    SET 
        -- Regular prices
        price_nok = CASE 
            WHEN price_usd IS NOT NULL THEN price_usd * NEW.rate 
            ELSE price_nok 
        END,
        price_nok_fixed = CASE 
            WHEN price_usd IS NOT NULL THEN ROUND((price_usd * NEW.rate) / 10) * 10 
            ELSE price_nok_fixed 
        END,
        -- New prices
        price_new_nok = CASE 
            WHEN price_new_usd IS NOT NULL THEN price_new_usd * NEW.rate 
            ELSE price_new_nok 
        END,
        price_new_nok_fixed = CASE 
            WHEN price_new_usd IS NOT NULL THEN ROUND((price_new_usd * NEW.rate) / 10) * 10 
            ELSE price_new_nok_fixed 
        END;
    
    RETURN NEW;
END;
$function$;

GRANT EXECUTE ON FUNCTION update_all_product_prices() TO authenticated;

GRANT EXECUTE ON FUNCTION update_all_product_prices() TO anon;

GRANT EXECUTE ON FUNCTION update_all_product_prices() TO service_role;

DROP FUNCTION IF EXISTS update_all_products_nok() CASCADE;

CREATE OR REPLACE FUNCTION update_all_products_nok()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
VOLATILE AS
$function$
BEGIN
    UPDATE products
    SET 
        price_nok = CASE 
            WHEN price_usd IS NOT NULL THEN price_usd * NEW.rate 
            ELSE price_nok 
        END,
        price_nok_fixed = CASE 
            WHEN price_usd IS NOT NULL THEN CEIL((price_usd * NEW.rate) / 10) * 10 
            ELSE price_nok_fixed 
        END,
        price_new_nok = CASE 
            WHEN price_new_usd IS NOT NULL THEN price_new_usd * NEW.rate 
            ELSE price_new_nok 
        END,
        price_new_nok_fixed = CASE 
            WHEN price_new_usd IS NOT NULL THEN CEIL((price_new_usd * NEW.rate) / 10) * 10 
            ELSE price_new_nok_fixed 
        END;
    RETURN NEW;
END;
$function$;

GRANT EXECUTE ON FUNCTION update_all_products_nok() TO authenticated;

GRANT EXECUTE ON FUNCTION update_all_products_nok() TO anon;

GRANT EXECUTE ON FUNCTION update_all_products_nok() TO service_role;

DROP FUNCTION IF EXISTS update_price_nok() CASCADE;

CREATE OR REPLACE FUNCTION update_price_nok()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
VOLATILE AS
$function$
DECLARE
    latest_rate numeric;
BEGIN
    -- Only proceed if we have a USD price to convert
    IF NEW.price_usd IS NULL THEN
        RETURN NEW;
    END IF;

    -- Get latest rate
    SELECT rate INTO latest_rate 
    FROM currency_rates 
    ORDER BY updated_at DESC 
    LIMIT 1;

    -- Verify we have a rate
    IF latest_rate IS NULL THEN
        RAISE EXCEPTION 'No currency rates found. Cannot update NOK price.';
    END IF;

    -- Calculate NOK prices
    NEW.price_nok := NEW.price_usd * latest_rate;
    NEW.price_nok_fixed := CEIL(NEW.price_nok / 10) * 10;

    RETURN NEW;
END;
$function$;

GRANT EXECUTE ON FUNCTION update_price_nok() TO authenticated;

GRANT EXECUTE ON FUNCTION update_price_nok() TO anon;

GRANT EXECUTE ON FUNCTION update_price_nok() TO service_role;

DROP FUNCTION IF EXISTS update_sales_totals() CASCADE;

CREATE OR REPLACE FUNCTION update_sales_totals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
VOLATILE AS
$function$

BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE sales
        SET sale_total = (
            SELECT SUM(sold_price)
            FROM sale_items
            WHERE sale_id = NEW.sale_id
        ),
        number_of_items = (
            SELECT COUNT(*)
            FROM sale_items
            WHERE sale_id = NEW.sale_id
        )
        WHERE id = NEW.sale_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE sales
        SET sale_total = (
            SELECT SUM(sold_price)
            FROM sale_items
            WHERE sale_id = OLD.sale_id
        ),
        number_of_items = (
            SELECT COUNT(*)
            FROM sale_items
            WHERE sale_id = OLD.sale_id
        )
        WHERE id = OLD.sale_id;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Handle updates to sold_price
        IF NEW.sold_price IS DISTINCT FROM OLD.sold_price THEN
            UPDATE sales
            SET sale_total = (
                SELECT SUM(sold_price)
                FROM sale_items
                WHERE sale_id = NEW.sale_id
            )
            WHERE id = NEW.sale_id;
        END IF;
    END IF;

    RETURN NULL; -- Result is ignored since this is an AFTER trigger
END;

$function$;

GRANT EXECUTE ON FUNCTION update_sales_totals() TO authenticated;

GRANT EXECUTE ON FUNCTION update_sales_totals() TO anon;

GRANT EXECUTE ON FUNCTION update_sales_totals() TO service_role;

DROP FUNCTION IF EXISTS validate_product_group_ids() CASCADE;

CREATE OR REPLACE FUNCTION validate_product_group_ids()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
VOLATILE AS
$function$

BEGIN
  IF NEW.product_group_ids IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 
      FROM unnest(NEW.product_group_ids) AS pg_id 
      LEFT JOIN product_groups ON product_groups.id = pg_id 
      WHERE product_groups.id IS NULL
    ) THEN
      RAISE EXCEPTION 'Invalid product group ID in array';
    END IF;
  END IF;
  RETURN NEW;
END;

$function$;

GRANT EXECUTE ON FUNCTION validate_product_group_ids() TO authenticated;

GRANT EXECUTE ON FUNCTION validate_product_group_ids() TO anon;

GRANT EXECUTE ON FUNCTION validate_product_group_ids() TO service_role;

-- ============================
-- DROP TABLES
-- ============================
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS sale_items CASCADE;
DROP TABLE IF EXISTS purchases CASCADE;
DROP TABLE IF EXISTS products_tags_relationship CASCADE;
DROP TABLE IF EXISTS products_tags CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS inventory_tags_relationship CASCADE;
DROP TABLE IF EXISTS inventory_tags CASCADE;
DROP TABLE IF EXISTS inventory_status_transitions CASCADE;
DROP TABLE IF EXISTS inventory_status_tracking CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS currency_rates CASCADE;

-- ============================
-- CREATE TABLES
-- ============================
CREATE TABLE currency_rates (
  id integer NOT NULL DEFAULT nextval('currency_rates_id_seq'::regclass),
  rate numeric NOT NULL,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE inventory (
  id integer NOT NULL DEFAULT nextval('inventory_id_seq'::regclass),
  product_id integer NOT NULL,
  purchase_id integer,
  sale_id integer,
  override_price numeric,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  inventory_status character varying(50) DEFAULT 'Normal'::character varying
);

CREATE TABLE inventory_status_tracking (
  id integer NOT NULL DEFAULT nextval('inventory_status_tracking_id_seq'::regclass),
  inventory_id integer NOT NULL,
  sale_id integer,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE inventory_status_transitions (
  id integer NOT NULL DEFAULT nextval('inventory_status_transitions_id_seq'::regclass),
  from_status character varying(50) NOT NULL,
  to_status character varying(50) NOT NULL,
  requires_sale_status character varying(50)
);

CREATE TABLE inventory_tags (
  id bigint NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  tag_name character varying,
  tag_description character varying
);

CREATE TABLE inventory_tags_relationship (
  id bigint NOT NULL,
  inventory_id bigint NOT NULL,
  tag_id bigint NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE products (
  id integer NOT NULL DEFAULT nextval('products_id_seq'::regclass),
  product_type character varying(50) NOT NULL,
  region character varying(50),
  product_title character varying(100) NOT NULL,
  product_variant character varying(50),
  release_year integer,
  price_usd numeric,
  price_nok numeric,
  price_nok_fixed numeric,
  is_product_active boolean NOT NULL DEFAULT true,
  product_notes text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  price_new_usd numeric,
  price_new_nok numeric,
  price_new_nok_fixed numeric,
  rating character varying(50),
  product_group character varying(50)
);

CREATE TABLE products_tags (
  id bigint NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  tag_name character varying,
  tag_description character varying
);

CREATE TABLE products_tags_relationship (
  id bigint NOT NULL,
  product_id integer NOT NULL,
  tag_id bigint NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE purchases (
  id integer NOT NULL DEFAULT nextval('purchases_id_seq'::regclass),
  seller_name character varying(100),
  origin character varying(50),
  purchase_cost numeric DEFAULT 0,
  purchase_date date NOT NULL,
  purchase_notes text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sale_items (
  id integer NOT NULL DEFAULT nextval('sale_items_id_seq'::regclass),
  sale_id integer NOT NULL,
  inventory_id integer NOT NULL,
  sold_price numeric NOT NULL
);

CREATE TABLE sales (
  id integer NOT NULL DEFAULT nextval('sales_id_seq'::regclass),
  buyer_name character varying(100),
  sale_total numeric,
  sale_date date,
  sale_notes text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  number_of_items integer DEFAULT 0,
  sale_status character varying
);

-- ============================
-- INDEXES
-- ============================
CREATE INDEX idx_inventory_product_id ON public.inventory USING btree (product_id);
CREATE INDEX idx_inventory_sale_id ON public.inventory USING btree (sale_id);
CREATE UNIQUE INDEX inventory_status_transitions_from_status_to_status_requires_key ON public.inventory_status_transitions USING btree (from_status, to_status, requires_sale_status);
CREATE INDEX idx_inventory_tags_relationship_inventory_id ON public.inventory_tags_relationship USING btree (inventory_id);
CREATE INDEX idx_inventory_tags_relationship_tag_id ON public.inventory_tags_relationship USING btree (tag_id);
CREATE INDEX idx_products_tags_relationship_product_id ON public.products_tags_relationship USING btree (product_id);
CREATE INDEX idx_products_tags_relationship_tag_id ON public.products_tags_relationship USING btree (tag_id);
CREATE INDEX idx_sale_items_inventory_id ON public.sale_items USING btree (inventory_id);
CREATE INDEX idx_sale_items_sale_id ON public.sale_items USING btree (sale_id);

-- ============================
-- TRIGGERS
-- ============================
DROP TRIGGER IF EXISTS inventory_delete_trigger ON inventory CASCADE;
CREATE TRIGGER inventory_delete_trigger BEFORE DELETE ON public.inventory FOR EACH ROW EXECUTE FUNCTION handle_inventory_delete();
DROP TRIGGER IF EXISTS inventory_override_price_update_trigger ON inventory CASCADE;
CREATE TRIGGER inventory_override_price_update_trigger BEFORE UPDATE OF override_price ON public.inventory FOR EACH ROW EXECUTE FUNCTION handle_override_price_change();
DROP TRIGGER IF EXISTS inventory_add_to_sale_trigger ON inventory CASCADE;
CREATE TRIGGER inventory_add_to_sale_trigger BEFORE UPDATE OF sale_id ON public.inventory FOR EACH ROW WHEN (((new.sale_id IS DISTINCT FROM old.sale_id) AND (new.sale_id IS NOT NULL))) EXECUTE FUNCTION handle_add_to_sale();
DROP TRIGGER IF EXISTS inventory_remove_from_sale_trigger ON inventory CASCADE;
CREATE TRIGGER inventory_remove_from_sale_trigger BEFORE UPDATE OF sale_id ON public.inventory FOR EACH ROW WHEN (((new.sale_id IS DISTINCT FROM old.sale_id) AND (new.sale_id IS NULL))) EXECUTE FUNCTION handle_remove_from_sale();
DROP TRIGGER IF EXISTS calculate_nok_prices_trigger ON products CASCADE;
CREATE TRIGGER calculate_nok_prices_trigger BEFORE INSERT OR UPDATE OF price_usd, price_new_usd ON public.products FOR EACH ROW EXECUTE FUNCTION calculate_nok_prices();
DROP TRIGGER IF EXISTS update_product_prices ON currency_rates CASCADE;
CREATE TRIGGER update_product_prices AFTER INSERT ON public.currency_rates FOR EACH ROW EXECUTE FUNCTION update_all_product_prices();
DROP TRIGGER IF EXISTS update_nok_on_usd_change ON products CASCADE;
CREATE TRIGGER update_nok_on_usd_change BEFORE INSERT OR UPDATE OF price_usd ON public.products FOR EACH ROW WHEN ((new.price_usd IS NOT NULL)) EXECUTE FUNCTION update_price_nok();
DROP TRIGGER IF EXISTS update_sales_totals_trigger ON sale_items CASCADE;
CREATE TRIGGER update_sales_totals_trigger AFTER INSERT OR DELETE OR UPDATE OF sold_price ON public.sale_items FOR EACH ROW EXECUTE FUNCTION update_sales_totals();
DROP TRIGGER IF EXISTS update_nok_on_rate_change ON currency_rates CASCADE;
CREATE TRIGGER update_nok_on_rate_change AFTER INSERT OR UPDATE ON public.currency_rates FOR EACH ROW EXECUTE FUNCTION update_all_products_nok();

-- ============================
-- TABLE DATA
-- ============================

-- Data for currency_rates
INSERT INTO currency_rates (id, rate, updated_at) VALUES (11, 11.5, '2024-12-28T12:13:20.889735+00:00');
INSERT INTO currency_rates (id, rate, updated_at) VALUES (12, 2.0, '2025-01-12T10:33:34.275723+00:00');
INSERT INTO currency_rates (id, rate, updated_at) VALUES (13, 10.78, '2025-01-12T10:34:29.316123+00:00');
INSERT INTO currency_rates (id, rate, updated_at) VALUES (14, 13.0, '2025-01-12T13:08:40.902263+00:00');

-- Data for inventory
INSERT INTO inventory (id, product_id, purchase_id, sale_id, override_price, created_at, inventory_status) VALUES (1005, 1081, NULL, NULL, NULL, '2025-01-17T13:45:39.16251+00:00', 'Normal');
INSERT INTO inventory (id, product_id, purchase_id, sale_id, override_price, created_at, inventory_status) VALUES (1001, 1083, NULL, NULL, NULL, '2025-01-17T13:45:39.16251+00:00', 'For Sale');
INSERT INTO inventory (id, product_id, purchase_id, sale_id, override_price, created_at, inventory_status) VALUES (1004, 1023, NULL, NULL, NULL, '2025-01-17T13:45:39.16251+00:00', 'Normal');
INSERT INTO inventory (id, product_id, purchase_id, sale_id, override_price, created_at, inventory_status) VALUES (1003, 1014, NULL, NULL, NULL, '2025-01-17T13:45:39.16251+00:00', 'Normal');
INSERT INTO inventory (id, product_id, purchase_id, sale_id, override_price, created_at, inventory_status) VALUES (1002, 1028, NULL, NULL, 44.0, '2025-01-17T13:45:39.16251+00:00', 'Collection');

-- Data for inventory_status_transitions
INSERT INTO inventory_status_transitions (id, from_status, to_status, requires_sale_status) VALUES (1, 'Normal', 'For Sale', NULL);
INSERT INTO inventory_status_transitions (id, from_status, to_status, requires_sale_status) VALUES (2, 'Normal', 'Collection', NULL);
INSERT INTO inventory_status_transitions (id, from_status, to_status, requires_sale_status) VALUES (3, 'For Sale', 'Normal', NULL);
INSERT INTO inventory_status_transitions (id, from_status, to_status, requires_sale_status) VALUES (4, 'For Sale', 'Collection', NULL);
INSERT INTO inventory_status_transitions (id, from_status, to_status, requires_sale_status) VALUES (6, 'Sold', 'For Sale', 'Reserved');
INSERT INTO inventory_status_transitions (id, from_status, to_status, requires_sale_status) VALUES (7, 'Collection', 'Normal', NULL);
INSERT INTO inventory_status_transitions (id, from_status, to_status, requires_sale_status) VALUES (8, 'Collection', 'For Sale', NULL);

-- Data for inventory_tags_relationship
INSERT INTO inventory_tags_relationship (id, inventory_id, tag_id, created_at) VALUES (1, 1002, 1, '2025-01-23T10:54:23.74943+00:00');

-- Data for products
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1003, 'Game', 'PAL', '007: Quantum of Solace', NULL, NULL, 10.1, 131.3, 140.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 30.3, 393.9, 390.0, 'PEGI 16', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1005, 'Game', 'PAL', '2006 FIFA World Cup Germany', NULL, NULL, 11.4, 148.2, 150.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 34.2, 444.6, 440.0, 'PEGI 3', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1006, 'Game', 'PAL', '2010 FIFA World Cup South Africa', NULL, NULL, 5.6, 72.8, 80.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 16.8, 218.4, 220.0, 'PEGI 3', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1007, 'Game', 'PAL', '2014 FIFA World Cup Brazil', NULL, NULL, 12.9, 167.7, 170.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 38.7, 503.1, 500.0, 'PEGI 3', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1011, 'Game', 'PAL', 'AC/DC Live: Rock Band Track Pack', NULL, NULL, 16.0, 208.0, 210.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 48.0, 624.0, 620.0, 'PEGI 12', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1012, 'Game', 'PAL', 'Ace Combat 6: Fires of Liberation', NULL, NULL, 5.1, 66.3, 70.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 15.3, 198.9, 200.0, 'PEGI 12', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1013, 'Game', 'PAL', 'Ace Combat: Assault Horizon', NULL, NULL, 14.8, 192.4, 200.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 44.4, 577.2, 580.0, 'PEGI 16', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1014, 'Game', 'PAL', 'Ace Combat: Assault Horizon', 'Limited Edition', NULL, 13.9, 180.7, 190.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 41.7, 542.1, 540.0, 'PEGI 16', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1015, 'Game', 'PAL', 'Adventure Time: Explore the Dungeon Because I Don''t Know', NULL, NULL, 15.9, 206.7, 210.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 47.7, 620.1, 620.0, 'PEGI 7', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1016, 'Game', 'PAL', 'Adventure Time: Finn & Jake Investigations', NULL, NULL, 14.1, 183.3, 190.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 42.3, 549.9, 550.0, 'PEGI 7', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1017, 'Game', 'PAL', 'Adventures of Tintin: The Secret of the Unicorn', NULL, NULL, 11.4, 148.2, 150.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 34.2, 444.6, 440.0, 'PEGI 12', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1018, 'Game', 'PAL', 'AFL Live', NULL, NULL, 12.3, 159.9, 160.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 36.9, 479.7, 480.0, NULL, 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1019, 'Game', 'PAL', 'AFL Live 2', NULL, NULL, 13.5, 175.5, 180.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 40.5, 526.5, 530.0, NULL, 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1002, 'Game', 'PAL', '007: Legends', '', NULL, 6.3, 81.9, 90.0, True, 'asdf', '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 18.9, 245.7, 250.0, 'PEGI 16', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1004, 'Game', NULL, '007: Quantum of Solace', 'Collectors Edition', NULL, 9.8, 127.4, 130.0, True, '', '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 29.4, 382.2, 380.0, NULL, 'Playstation 4');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1001, 'Game', 'PAL', '007: Blood Stone2', NULL, NULL, 7.0, 91.0, 100.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 21.0, 273.0, 270.0, 'PEGI 16', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1008, 'Console', 'PAL', '2014 FIFA World Cup Brazil', 'Champions Edition', NULL, 5.0, 65.0, 70.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 15.0, 195.0, 200.0, 'PEGI 3', 'Xbox');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1009, 'Peripheral', 'PAL', '50 Cent: Blood on the Sand', NULL, NULL, 7.0, 91.0, 100.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 21.0, 273.0, 270.0, 'PEGI 18', 'Playstation 3');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1010, 'Game', 'PAL', 'A-Train HX', NULL, NULL, 17.0, 221.0, 230.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 51.0, 663.0, 660.0, 'PEGI 3', 'Other');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1020, 'Game', 'PAL', 'Afro Samurai', NULL, NULL, 12.3, 159.9, 160.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 36.9, 479.7, 480.0, NULL, 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1021, 'Game', 'PAL', 'Air Conflicts: Pacific Carriers', NULL, NULL, 10.8, 140.4, 150.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 32.4, 421.2, 420.0, 'PEGI 16', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1022, 'Game', 'PAL', 'Air Conflicts: Secret Wars', NULL, NULL, 5.2, 67.6, 70.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 15.6, 202.8, 200.0, 'PEGI 12', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1023, 'Game', 'PAL', 'Air Conflicts: Vietnam', NULL, NULL, 8.2, 106.6, 110.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 24.6, 319.8, 320.0, 'PEGI 16', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1024, 'Game', 'PAL', 'Akai Katana', NULL, NULL, 9.3, 120.9, 130.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 27.9, 362.7, 360.0, 'PEGI 12', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1025, 'Game', 'PAL', 'Alan Wake', NULL, NULL, 6.4, 83.2, 90.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 19.2, 249.6, 250.0, 'PEGI 16', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1026, 'Game', 'PAL', 'Alan Wake', 'Limited Collectors Edition', NULL, 7.0, 91.0, 100.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 21.0, 273.0, 270.0, 'PEGI 16', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1027, 'Game', 'PAL', 'Alice: Madness Returns', NULL, NULL, 14.4, 187.2, 190.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 43.2, 561.6, 560.0, 'PEGI 18', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1028, 'Game', 'PAL', 'Alien Breed Trilogy', NULL, NULL, 16.0, 208.0, 210.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 48.0, 624.0, 620.0, 'PEGI 16', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1029, 'Game', 'PAL', 'Alien Isolation', 'Nostromo Edition', NULL, 9.6, 124.8, 130.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 28.8, 374.4, 370.0, 'PEGI 18', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1030, 'Game', 'PAL', 'Alien Isolation', 'Ripley Edition', NULL, 10.0, 130.0, 130.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 30.0, 390.0, 390.0, 'PEGI 18', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1031, 'Game', 'PAL', 'Alien: Isolation', 'EVAC Lifeboat Steelbook Edition', NULL, 10.3, 133.9, 140.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 30.9, 401.7, 400.0, 'PEGI 18', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1032, 'Game', 'PAL', 'Aliens vs. Predator', NULL, NULL, 10.6, 137.8, 140.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 31.8, 413.4, 410.0, 'PEGI 18', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1033, 'Game', 'PAL', 'Aliens vs. Predator', 'Hunter Edition', NULL, 5.7, 74.1, 80.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 17.1, 222.3, 220.0, 'PEGI 18', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1034, 'Game', 'PAL', 'Aliens vs. Predator', 'Survivor Edition', NULL, 15.0, 195.0, 200.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 45.0, 585.0, 590.0, 'PEGI 18', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1035, 'Game', 'PAL', 'Aliens: Colonial Marines', 'Collector''s Edition', NULL, 14.7, 191.1, 200.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 44.1, 573.3, 570.0, 'PEGI 18', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1036, 'Game', 'PAL', 'Aliens: Colonial Marines', 'Extermination Edition', NULL, 13.7, 178.1, 180.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 41.1, 534.3, 530.0, 'PEGI 18', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1037, 'Game', 'PAL', 'Aliens: Colonial Marines', 'Limited Edition', NULL, 8.5, 110.5, 120.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 25.5, 331.5, 330.0, 'PEGI 18', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1038, 'Game', 'PAL', 'Alone in the Dark', NULL, NULL, 12.8, 166.4, 170.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 38.4, 499.2, 500.0, 'PEGI 18', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1039, 'Game', 'PAL', 'Alone in the Dark', 'Limited Edition', NULL, 6.5, 84.5, 90.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 19.5, 253.5, 250.0, 'PEGI 16', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1040, 'Game', 'PAL', 'Alone In The Dark', 'Steelbook Edition', NULL, 10.6, 137.8, 140.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 31.8, 413.4, 410.0, 'PEGI 16', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1041, 'Game', 'PAL', 'Alpha Protocol', NULL, NULL, 8.0, 104.0, 110.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 24.0, 312.0, 310.0, 'PEGI 18', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1042, 'Game', 'PAL', 'Alvin and the Chipmunks: Chipwrecked', 'Kinect', NULL, 12.7, 165.1, 170.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 38.1, 495.3, 500.0, NULL, 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1043, 'Game', 'PAL', 'Amazing Spiderman 2, The', NULL, NULL, 5.9, 76.7, 80.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 17.7, 230.1, 230.0, 'PEGI 16', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1044, 'Game', 'PAL', 'Amazing Spiderman, The', NULL, NULL, 14.9, 193.7, 200.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 44.7, 581.1, 580.0, 'PEGI 16', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1045, 'Game', 'PAL', 'Amped 3', NULL, NULL, 14.7, 191.1, 200.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 44.1, 573.3, 570.0, 'PEGI 7', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1046, 'Game', 'PAL', 'Anarchy Reigns', NULL, NULL, 13.8, 179.4, 180.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 41.4, 538.2, 540.0, 'PEGI 16', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1047, 'Game', 'PAL', 'Anarchy Reigns', 'Limited Edition', NULL, 13.8, 179.4, 180.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 41.4, 538.2, 540.0, 'PEGI 16', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1048, 'Game', 'PAL', 'Angry Birds Trilogy', NULL, NULL, 5.9, 76.7, 80.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 17.7, 230.1, 230.0, 'PEGI 3', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1049, 'Game', 'PAL', 'Angry Birds: Star Wars', NULL, NULL, 14.9, 193.7, 200.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 44.7, 581.1, 580.0, 'PEGI 3', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1050, 'Game', 'PAL', 'Apache: Air Assault', NULL, NULL, 7.9, 102.7, 110.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 23.7, 308.1, 310.0, 'PEGI 16', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1051, 'Game', 'PAL', 'Arcana Heart 3', NULL, NULL, 7.0, 91.0, 100.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 21.0, 273.0, 270.0, 'PEGI 12', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1052, 'Game', 'PAL', 'Arcana Heart 3', 'Limited Edition', NULL, 6.0, 78.0, 80.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 18.0, 234.0, 230.0, 'PEGI 12', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1053, 'Game', 'PAL', 'Arcania: Gothic 4', NULL, NULL, 12.2, 158.6, 160.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 36.6, 475.8, 480.0, 'PEGI 16', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1054, 'Game', 'PAL', 'Arcania: The Complete Tale', NULL, NULL, 14.5, 188.5, 190.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 43.5, 565.5, 570.0, 'PEGI 16', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1055, 'Game', 'PAL', 'Armored Core 4', NULL, NULL, 11.4, 148.2, 150.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 34.2, 444.6, 440.0, NULL, 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1056, 'Game', 'PAL', 'Armored Core V', NULL, NULL, 12.9, 167.7, 170.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 38.7, 503.1, 500.0, NULL, 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1057, 'Game', 'PAL', 'Armored Core: For Answer', NULL, NULL, 15.9, 206.7, 210.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 47.7, 620.1, 620.0, NULL, 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1058, 'Game', 'PAL', 'Armored Core: Verdict Day', NULL, NULL, 12.0, 156.0, 160.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 36.0, 468.0, 470.0, NULL, 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1059, 'Game', 'PAL', 'Army of Two', NULL, NULL, 10.6, 137.8, 140.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 31.8, 413.4, 410.0, 'PEGI 18', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1060, 'Game', 'PAL', 'Army of Two: The 40th Day', NULL, NULL, 8.4, 109.2, 110.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 25.2, 327.6, 330.0, 'PEGI 18', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1061, 'Game', 'PAL', 'Army of Two: The Devil''s Cartel', NULL, NULL, 10.3, 133.9, 140.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 30.9, 401.7, 400.0, 'PEGI 18', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1062, 'Game', 'PAL', 'Ashes Cricket', NULL, NULL, 5.1, 66.3, 70.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 15.3, 198.9, 200.0, 'PEGI 3', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1063, 'Game', 'PAL', 'Assassin''s Creed', NULL, NULL, 16.8, 218.4, 220.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 50.4, 655.2, 660.0, 'PEGI 18', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1064, 'Game', 'PAL', 'Assassin''s Creed', 'Classics', NULL, 12.6, 163.8, 170.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 37.8, 491.4, 490.0, 'PEGI 18', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1065, 'Game', 'PAL', 'Assassin''s Creed', 'Heritage Collection', NULL, 14.5, 188.5, 190.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 43.5, 565.5, 570.0, 'PEGI 18', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1066, 'Game', 'PAL', 'Assassin''s Creed Brotherhood', NULL, NULL, 8.2, 106.6, 110.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 24.6, 319.8, 320.0, 'PEGI 18', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1067, 'Game', 'PAL', 'Assassin''s Creed Brotherhood', 'Auditore Edition', NULL, 7.0, 91.0, 100.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 21.0, 273.0, 270.0, 'PEGI 18', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1068, 'Game', 'PAL', 'Assassin''s Creed Brotherhood', 'Classics', NULL, 14.4, 187.2, 190.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 43.2, 561.6, 560.0, 'PEGI 18', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1069, 'Game', 'PAL', 'Assassin''s Creed Brotherhood', 'Codex Edition', NULL, 13.2, 171.6, 180.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 39.6, 514.8, 510.0, 'PEGI 18', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1070, 'Game', 'PAL', 'Assassin''s Creed Brotherhood', 'Special Edition', NULL, 15.2, 197.6, 200.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 45.6, 592.8, 590.0, 'PEGI 18', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1071, 'Game', 'PAL', 'Assassin''s Creed Compilation', NULL, NULL, 10.1, 131.3, 140.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 30.3, 393.9, 390.0, 'PEGI 18', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1072, 'Game', 'PAL', 'Assassin''s Creed Double Pack', NULL, NULL, 6.9, 89.7, 90.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 20.7, 269.1, 270.0, 'PEGI 18', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1073, 'Game', 'PAL', 'Assassin''s Creed II', NULL, NULL, 11.9, 154.7, 160.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 35.7, 464.1, 460.0, 'PEGI 18', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1074, 'Game', 'PAL', 'Assassin''s Creed II', 'Black Edition', NULL, 11.7, 152.1, 160.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 35.1, 456.3, 460.0, 'PEGI 18', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1075, 'Game', 'PAL', 'Assassin''s Creed II', 'Complete Edition', NULL, 6.6, 85.8, 90.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 19.8, 257.4, 260.0, 'PEGI 18', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1076, 'Game', 'PAL', 'Assassin''s Creed II', 'Game of the Year', NULL, 12.7, 165.1, 170.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 38.1, 495.3, 500.0, 'PEGI 18', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1077, 'Game', 'PAL', 'Assassin''s Creed II', 'Special Film Edition', NULL, 11.9, 154.7, 160.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 35.7, 464.1, 460.0, 'PEGI 18', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1078, 'Game', 'PAL', 'Assassin''s Creed II', 'White Edition', NULL, 7.4, 96.2, 100.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 22.2, 288.6, 290.0, 'PEGI 18', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1079, 'Game', 'PAL', 'Assassin''s Creed III', NULL, NULL, 9.3, 120.9, 130.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 27.9, 362.7, 360.0, 'PEGI 18', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1080, 'Game', 'PAL', 'Assassin''s Creed III', 'Freedom Edition', NULL, 8.1, 105.3, 110.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 24.3, 315.9, 320.0, 'PEGI 18', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1081, 'Game', 'PAL', 'Assassin''s Creed III', 'Join or Die Edition', NULL, 6.2, 80.6, 90.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 18.6, 241.8, 240.0, 'PEGI 18', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1082, 'Game', 'PAL', 'Assassin''s Creed III', 'Special Edition', NULL, 14.0, 182.0, 190.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 42.0, 546.0, 550.0, 'PEGI 18', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1083, 'Game', 'PAL', 'Assassin''s Creed III', 'Steelbook', NULL, 16.3, 211.9, 220.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 48.9, 635.7, 640.0, 'PEGI 18', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1084, 'Game', 'PAL', 'Assassin''s Creed III', 'Washington Edition', NULL, 7.7, 100.1, 110.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 23.1, 300.3, 300.0, 'PEGI 18', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1085, 'Game', 'PAL', 'Assassin''s Creed IV', 'Black Chest Edition', NULL, 12.3, 159.9, 160.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 36.9, 479.7, 480.0, 'PEGI 18', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1086, 'Game', 'PAL', 'Assassin''s Creed IV: Black Flag', NULL, NULL, 6.2, 80.6, 90.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 18.6, 241.8, 240.0, 'PEGI 18', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1087, 'Game', 'PAL', 'Assassin''s Creed IV: Black Flag', 'Buccaneer Edition', NULL, 5.2, 67.6, 70.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 15.6, 202.8, 200.0, 'PEGI 18', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1088, 'Game', 'PAL', 'Assassin''s Creed IV: Black Flag', 'Classics', NULL, 12.8, 166.4, 170.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 38.4, 499.2, 500.0, 'PEGI 18', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1089, 'Game', 'PAL', 'Assassin''s Creed IV: Black Flag + Assassin''s Creed Rogue', 'Double Pack', NULL, 11.6, 150.8, 160.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 34.8, 452.4, 450.0, 'PEGI 18', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1090, 'Game', 'PAL', 'Assassin''s Creed IV: Black Flag', 'Skull Edition', NULL, 7.4, 96.2, 100.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 22.2, 288.6, 290.0, 'PEGI 18', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1091, 'Game', 'PAL', 'Assassin''s Creed IV: Black Flag', 'Special Edition', NULL, 10.3, 133.9, 140.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 30.9, 401.7, 400.0, 'PEGI 18', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1092, 'Game', 'PAL', 'Assassin''s Creed Revelations', NULL, NULL, 12.4, 161.2, 170.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 37.2, 483.6, 480.0, 'PEGI 18', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1093, 'Game', 'PAL', 'Assassin''s Creed Revelations', 'Collector''s Edition', NULL, 8.2, 106.6, 110.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 24.6, 319.8, 320.0, 'PEGI 18', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1094, 'Game', 'PAL', 'Assassin''s Creed Revelations', 'Ottoman Edition', NULL, 12.4, 161.2, 170.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 37.2, 483.6, 480.0, 'PEGI 18', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1095, 'Game', 'PAL', 'Assassin''s Creed Rogue', NULL, NULL, 14.5, 188.5, 190.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 43.5, 565.5, 570.0, 'PEGI 18', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1096, 'Game', 'PAL', 'Assassin''s Creed Rogue', 'Collector''s Edition', NULL, 6.1, 79.3, 80.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 18.3, 237.9, 240.0, 'PEGI 18', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1097, 'Game', 'PAL', 'Assassin''s Creed: Birth Of A New World The American Saga', NULL, NULL, 6.6, 85.8, 90.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 19.8, 257.4, 260.0, 'PEGI 18', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1098, 'Game', 'PAL', 'Asterix At The Olympic Games', NULL, NULL, 13.8, 179.4, 180.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 41.4, 538.2, 540.0, 'PEGI 18', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1099, 'Game', 'PAL', 'Asura''s Wrath', NULL, NULL, 12.4, 161.2, 170.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 37.2, 483.6, 480.0, 'PEGI 16', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1100, 'Game', 'PAL', 'Avatar: The Game', NULL, NULL, 13.1, 170.3, 180.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 39.3, 510.9, 510.0, 'PEGI 12', 'Xbox 360');
INSERT INTO products (id, product_type, region, product_title, product_variant, release_year, price_usd, price_nok, price_nok_fixed, is_product_active, product_notes, created_at, updated_at, price_new_usd, price_new_nok, price_new_nok_fixed, rating, product_group) VALUES (1101, 'Game', 'PAL', 'Avatar: The Legend of Aang - The Burning Earth', NULL, NULL, 8.3, 107.9, 110.0, True, NULL, '2025-01-17T13:45:39.16251+00:00', '2025-01-17T13:45:39.16251+00:00', 24.9, 323.7, 320.0, 'PEGI 7', 'Xbox 360');

-- Data for products_tags_relationship
INSERT INTO products_tags_relationship (id, product_id, tag_id, created_at) VALUES (1, 1004, 1, '2025-01-23T11:00:33.309833+00:00');

-- Data for sales
INSERT INTO sales (id, buyer_name, sale_total, sale_date, sale_notes, created_at, number_of_items, sale_status) VALUES (3, 'Johnny', NULL, NULL, NULL, '2025-01-03T19:49:41.003554+00:00', 0, NULL);

-- ============================
-- VIEWS
-- ============================
DROP VIEW IF EXISTS view_inventory CASCADE;

CREATE VIEW view_inventory AS
 WITH inventory_prices AS (
         SELECT i_1.id AS inventory_id,
            i_1.override_price,
            p_1.price_nok_fixed,
            p_1.price_new_nok_fixed,
                CASE
                    WHEN i_1.override_price IS NOT NULL THEN i_1.override_price
                    WHEN p_1.price_new_nok_fixed IS NOT NULL THEN p_1.price_new_nok_fixed
                    ELSE p_1.price_nok_fixed
                END AS final_price
           FROM inventory i_1
             JOIN products p_1 ON i_1.product_id = p_1.id
        )
 SELECT i.id AS inventory_id,
    i.product_id,
    i.purchase_id,
    i.sale_id,
    i.inventory_status,
    i.created_at AS inventory_created_at,
    p.product_title,
    p.product_variant,
    p.release_year,
    p.is_product_active,
    p.product_notes,
    p.created_at AS product_created_at,
    p.updated_at AS product_updated_at,
    p.product_group AS product_group_name,
    p.product_type AS product_type_name,
    p.rating AS rating_name,
    p.region AS region_name,
    ip.override_price,
    ip.price_nok_fixed,
    ip.price_new_nok_fixed,
    ip.final_price,
    pu.seller_name AS purchase_seller,
    pu.origin AS purchase_origin,
    pu.purchase_cost,
    pu.purchase_date,
    pu.purchase_notes,
    s.buyer_name AS sale_buyer,
    s.sale_status,
    s.sale_date,
    s.sale_notes,
    si.sold_price
   FROM inventory i
     JOIN products p ON i.product_id = p.id
     LEFT JOIN inventory_prices ip ON ip.inventory_id = i.id
     LEFT JOIN purchases pu ON i.purchase_id = pu.id
     LEFT JOIN sales s ON i.sale_id = s.id
     LEFT JOIN sale_items si ON si.inventory_id = i.id;;

DROP VIEW IF EXISTS view_products CASCADE;

CREATE VIEW view_products AS
 WITH inventory_counts AS (
         SELECT i.product_id,
            count(*) FILTER (WHERE i.inventory_status::text = 'Normal'::text) AS normal_count,
            count(*) FILTER (WHERE i.inventory_status::text = 'For Sale'::text) AS for_sale_count,
            count(*) FILTER (WHERE i.inventory_status::text = 'Collection'::text) AS collection_count,
            count(*) FILTER (WHERE i.inventory_status::text = 'Sold'::text) AS sold_count,
            count(*) AS total_count
           FROM inventory i
          GROUP BY i.product_id
        ), sale_stats AS (
         SELECT i.product_id,
            count(DISTINCT s.id) AS total_sales,
            count(DISTINCT s.buyer_name) AS unique_buyers,
            avg(si.sold_price) AS avg_sale_price,
            max(si.sold_price) AS max_sale_price,
            min(si.sold_price) AS min_sale_price
           FROM inventory i
             JOIN sales s ON i.sale_id = s.id
             JOIN sale_items si ON si.inventory_id = i.id
          GROUP BY i.product_id
        )
 SELECT p.id AS product_id,
    p.product_title,
    p.product_variant,
    p.release_year,
    p.is_product_active,
    p.product_notes,
    p.created_at AS product_created_at,
    p.updated_at AS product_updated_at,
    p.product_group AS product_group_name,
    p.product_type AS product_type_name,
    p.rating AS rating_name,
    p.region AS region_name,
    p.price_usd,
    p.price_nok,
    p.price_nok_fixed,
    p.price_new_usd,
    p.price_new_nok,
    p.price_new_nok_fixed,
        CASE
            WHEN p.price_new_nok_fixed IS NOT NULL THEN p.price_new_nok_fixed
            ELSE p.price_nok_fixed
        END AS final_price,
    COALESCE(ic.normal_count, 0::bigint) AS normal_count,
    COALESCE(ic.for_sale_count, 0::bigint) AS for_sale_count,
    COALESCE(ic.collection_count, 0::bigint) AS collection_count,
    COALESCE(ic.sold_count, 0::bigint) AS sold_count,
    COALESCE(ic.total_count, 0::bigint) AS total_count,
    COALESCE(ss.total_sales, 0::bigint) AS total_sales,
    COALESCE(ss.unique_buyers, 0::bigint) AS unique_buyers,
    ss.avg_sale_price,
    ss.max_sale_price,
    ss.min_sale_price
   FROM products p
     LEFT JOIN inventory_counts ic ON ic.product_id = p.id
     LEFT JOIN sale_stats ss ON ss.product_id = p.id;;

DROP VIEW IF EXISTS view_sale_items CASCADE;

CREATE VIEW view_sale_items AS
 SELECT si.id AS sale_item_id,
    si.sale_id,
    si.inventory_id,
    si.sold_price,
    p.product_title,
    p.product_variant,
    p.product_group AS product_group_name,
    p.product_type AS product_type_name,
    p.rating AS rating_name,
    p.region AS region_name
   FROM sale_items si
     JOIN inventory i ON si.inventory_id = i.id
     JOIN products p ON i.product_id = p.id;;

DROP VIEW IF EXISTS view_sales CASCADE;

CREATE VIEW view_sales AS
 SELECT s.id AS sale_id,
    s.buyer_name,
    s.sale_total,
    s.sale_date,
    s.sale_notes,
    s.created_at,
    s.number_of_items,
    s.sale_status,
    count(si.id) AS item_count,
    sum(si.sold_price) AS total_sold_price,
    array_agg(p.product_title) AS product_titles,
    array_agg(p.product_variant) AS product_variants,
    array_agg(p.product_group) AS product_groups
   FROM sales s
     LEFT JOIN sale_items si ON s.id = si.sale_id
     LEFT JOIN inventory i ON si.inventory_id = i.id
     LEFT JOIN products p ON i.product_id = p.id
  GROUP BY s.id, s.buyer_name, s.sale_total, s.sale_date, s.sale_notes, s.created_at, s.number_of_items, s.sale_status;;

DROP VIEW IF EXISTS view_tags_relationship CASCADE;

CREATE VIEW view_tags_relationship AS
 SELECT jsonb_build_object('products', COALESCE(( SELECT jsonb_object_agg(p.id::text, pt.tags) AS jsonb_object_agg
           FROM products p
             LEFT JOIN ( SELECT ptr.product_id,
                    jsonb_agg(DISTINCT pt_1.tag_name) AS tags
                   FROM products_tags_relationship ptr
                     LEFT JOIN products_tags pt_1 ON ptr.tag_id = pt_1.id
                  GROUP BY ptr.product_id) pt ON p.id = pt.product_id
          WHERE pt.tags IS NOT NULL), '{}'::jsonb), 'inventory', COALESCE(( SELECT jsonb_object_agg(i.id::text, it.tags) AS jsonb_object_agg
           FROM inventory i
             LEFT JOIN ( SELECT itr.inventory_id,
                    jsonb_agg(DISTINCT it_1.tag_name) AS tags
                   FROM inventory_tags_relationship itr
                     LEFT JOIN inventory_tags it_1 ON itr.tag_id = it_1.id
                  GROUP BY itr.inventory_id) it ON i.id = it.inventory_id
          WHERE it.tags IS NOT NULL), '{}'::jsonb)) AS combined_data;;


COMMIT;
