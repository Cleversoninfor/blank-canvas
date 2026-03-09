-- Update get_kitchen_items function to include items from orders with ANY active status
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
  with table_items as (
    select
      toi.id,
      toi.table_order_id,
      null::bigint as order_id,
      toi.product_id,
      toi.product_name,
      toi.quantity,
      toi.observation,
      toi.unit_price,
      coalesce(toi.status, 'pending') as status,
      coalesce(toi.ordered_at, toi.created_at, now()) as ordered_at,
      toi.delivered_at,
      t.number as table_number,
      t.name as table_name,
      to2.waiter_name,
      'table'::text as order_type,
      null::text as customer_name
    from public.table_order_items toi
    join public.table_orders to2 on to2.id = toi.table_order_id
    left join public.tables t on t.id = to2.table_id
    -- Include all open, requesting_bill orders, and also any with pending/preparing items
    where (to2.status in ('open', 'requesting_bill') 
           OR coalesce(toi.status, 'pending') in ('pending', 'preparing'))
      and (
        _status_filter is null
        and coalesce(toi.status, 'pending') in ('pending','preparing','ready')
        or _status_filter is not null and coalesce(toi.status, 'pending') = _status_filter
      )
  ),
  delivery_items as (
    select
      oi.id,
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
      'delivery'::text as order_type,
      o.customer_name
    from public.orders o
    join public.order_items oi on oi.order_id = o.id
    where o.status in ('pending', 'preparing', 'ready')
      and (
        _status_filter is null
        or o.status = _status_filter
      )
  )
  select * from table_items
  union all
  select * from delivery_items
  order by ordered_at asc;
$$;