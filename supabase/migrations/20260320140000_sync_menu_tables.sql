-- Migration: Sync Menu Orders with Table Orders
-- Description: Adds columns to link menu orders with table sessions and updates RPC functions.

-- 1. Add columns to table_orders to store customer info from menu
ALTER TABLE public.table_orders 
ADD COLUMN IF NOT EXISTS customer_name text,
ADD COLUMN IF NOT EXISTS customer_phone text;

-- 2. Add table_id to orders table to link menu order to a specific table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS table_id uuid REFERENCES public.tables(id);

-- 3. Update create_order_with_items to handle dine-in menu orders
CREATE OR REPLACE FUNCTION public.create_order_with_items(
  _customer_name text,
  _customer_phone text,
  _address_street text,
  _address_number text,
  _address_neighborhood text,
  _total_amount numeric,
  _payment_method text,
  _items jsonb,
  _address_complement text DEFAULT NULL,
  _address_reference text DEFAULT NULL,
  _change_for numeric DEFAULT NULL,
  _latitude numeric DEFAULT NULL,
  _longitude numeric DEFAULT NULL,
  _table_id uuid DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id bigint;
  v_table_order_id bigint;
  v_item jsonb;
BEGIN
  -- Insert the main order
  INSERT INTO public.orders (
    customer_name,
    customer_phone,
    address_street,
    address_number,
    address_neighborhood,
    address_complement,
    address_reference,
    total_amount,
    payment_method,
    change_for,
    latitude,
    longitude,
    table_id,
    status
  )
  VALUES (
    _customer_name,
    _customer_phone,
    _address_street,
    _address_number,
    _address_neighborhood,
    _address_complement,
    _address_reference,
    _total_amount,
    _payment_method,
    _change_for,
    _latitude,
    _longitude,
    _table_id,
    'pending'
  )
  RETURNING id INTO v_order_id;

  -- Insert order items
  FOR v_item IN SELECT * FROM jsonb_array_elements(_items)
  LOOP
    INSERT INTO public.order_items (
      order_id,
      product_id,
      product_name,
      quantity,
      unit_price,
      observation
    )
    VALUES (
      v_order_id,
      (v_item->>'product_id')::uuid,
      v_item->>'product_name',
      (v_item->>'quantity')::integer,
      (v_item->>'unit_price')::numeric,
      v_item->>'observation'
    );
  END LOOP;

  -- SPECIAL LOGIC FOR DINE-IN (Consumir no Local)
  -- If table_id is provided or address is 'Consumir no Local', sync with table_orders
  IF _table_id IS NOT NULL OR _address_street = 'Consumir no Local' THEN
    -- Try to find an open table session or create one
    SELECT id INTO v_table_order_id
    FROM public.table_orders
    WHERE table_id = _table_id AND status = 'open'
    ORDER BY opened_at DESC
    LIMIT 1;

    IF v_table_order_id IS NULL AND _table_id IS NOT NULL THEN
      -- Create a new session
      INSERT INTO public.table_orders (
        table_id,
        customer_name,
        customer_phone,
        status,
        opened_at
      )
      VALUES (
        _table_id,
        _customer_name,
        _customer_phone,
        'open',
        now()
      )
      RETURNING id INTO v_table_order_id;

      -- Update table status to occupied
      UPDATE public.tables 
      SET status = 'occupied', current_order_id = v_table_order_id 
      WHERE id = _table_id;
    END IF;

    -- If we have a session (existing or new), insert items to table_order_items too
    -- This makes them appear in the PDV and Kitchen via the table logic
    IF v_table_order_id IS NOT NULL THEN
      FOR v_item IN SELECT * FROM jsonb_array_elements(_items)
      LOOP
        INSERT INTO public.table_order_items (
          table_order_id,
          product_id,
          product_name,
          quantity,
          unit_price,
          observation,
          status
        )
        VALUES (
          v_table_order_id,
          (v_item->>'product_id')::uuid,
          v_item->>'product_name',
          (v_item->>'quantity')::integer,
          (v_item->>'unit_price')::numeric,
          v_item->>'observation',
          'pending'
        );
      END LOOP;

      -- Update table order total
      PERFORM public.update_table_order_total(v_table_order_id, _total_amount);
    END IF;
  END IF;

  RETURN v_order_id;
END;
$$;

-- 4. Update get_kitchen_items to avoid duplication
-- We will exclude 'Consumir no Local' orders from the 'delivery_items' part of the view
-- since they are already included via 'table_items'
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
      to2.customer_name as customer_name -- Now we have this in table_orders
    from public.table_order_items toi
    join public.table_orders to2 on to2.id = toi.table_order_id
    left join public.tables t on t.id = to2.table_id
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
      md5(oi.id::text || o.id::text)::uuid as id, -- Generate uuid for union
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
      and o.address_street != 'Consumir no Local' -- EXCLUDE DINE-IN FROM THIS PART TO AVOID DUPLICATES
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
