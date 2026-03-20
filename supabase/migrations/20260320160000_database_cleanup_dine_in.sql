-- 1. Remove references from orders table
ALTER TABLE public.orders DROP COLUMN IF EXISTS table_id;

-- 2. Drop Dine-in related tables
-- Using CASCADE to remove any remaining triggers or dependencies
DROP TABLE IF EXISTS public.table_order_items CASCADE;
DROP TABLE IF EXISTS public.table_orders CASCADE;
DROP TABLE IF EXISTS public.tables CASCADE;
DROP TABLE IF EXISTS public.qrcode_sessions CASCADE;

-- 3. Drop obsolete functions
DROP FUNCTION IF EXISTS public.update_table_order_total(bigint, numeric);
DROP FUNCTION IF EXISTS public.sync_table_order_items();
DROP FUNCTION IF EXISTS public.close_table_order(bigint, uuid, numeric, text);
DROP FUNCTION IF EXISTS public.create_table_order(uuid);

-- 4. Clean up get_kitchen_items function
-- Simplified to only fetch from main orders table but correctly labeling 'comanda' items
CREATE OR REPLACE FUNCTION public.get_kitchen_items(_status_filter text DEFAULT NULL)
RETURNS TABLE(
  id uuid,
  table_order_id bigint,
  order_id bigint,
  product_id uuid,
  product_name text,
  quantity integer,
  observation text,
  unit_price numeric,
  status text,
  ordered_at timestamptz,
  delivered_at timestamptz,
  table_number integer,
  table_name text,
  waiter_name text,
  order_type text,
  customer_name text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    select
      md5(oi.id::text || o.id::text)::uuid as id,
      null::bigint as table_order_id,
      o.id as order_id,
      null::uuid as product_id,
      oi.product_name,
      oi.quantity,
      oi.observation,
      oi.unit_price,
      o.status as status,
      coalesce(o.created_at, now()) as ordered_at,
      null::timestamptz as delivered_at,
      null::integer as table_number,
      null::text as table_name,
      null::text as waiter_name,
      (CASE 
        WHEN o.address_street = 'Retirada no local' THEN 'pickup'
        WHEN o.address_street = 'Local' OR o.customer_name LIKE 'Comanda #%' THEN 'comanda'
        ELSE 'delivery'
      END)::text as order_type,
      o.customer_name
    from public.orders o
    join public.order_items oi on oi.order_id = o.id
    where o.status in ('pending', 'preparing', 'ready')
      and (
        _status_filter is null
        or o.status = _status_filter
      )
    order by ordered_at asc;
$$;
