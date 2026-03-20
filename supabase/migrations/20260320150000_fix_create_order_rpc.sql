-- Migration: Revert create_order_with_items RPC (Removal of Dine-in)
-- Description: Removes _table_id and table synchronization logic while KEEPING stock management.

-- 1. MASTER WIPE: Drop all versions of the function to clean up signature clutter
DO $$
DECLARE
    _r record;
BEGIN
    FOR _r IN (SELECT oid::regprocedure as name FROM pg_proc WHERE proname = 'create_order_with_items' AND pronamespace = 'public'::regnamespace)
    LOOP
        EXECUTE 'DROP FUNCTION ' || _r.name;
    END LOOP;
END $$;

-- 2. CREATE SIMPLIFIED CONSOLIDATED FUNCTION (Delivery/Pickup Only)
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
  _longitude numeric DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id bigint;
  v_item jsonb;
  v_product_id uuid;
  v_quantity integer;
  v_prod_rec record;
  v_ing_rec record;
  v_required_stock numeric;
BEGIN
  -- FIRST PASS: VALIDATE STOCK
  FOR v_item IN SELECT * FROM jsonb_array_elements(_items)
  LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_quantity := (v_item->>'quantity')::integer;

    IF v_product_id IS NOT NULL THEN
      SELECT * INTO v_prod_rec FROM public.products WHERE id = v_product_id;
      
      IF FOUND THEN
        -- Check unit stock
        IF v_prod_rec.stock_type = 'unit' THEN
          IF v_prod_rec.stock_quantity < v_quantity THEN
            RAISE EXCEPTION 'Estoque insuficiente para o produto %: disponível %, solicitado %', v_prod_rec.name, v_prod_rec.stock_quantity, v_quantity;
          END IF;
        
        -- Check ingredient stock
        ELSIF v_prod_rec.stock_type = 'ingredient' THEN
          FOR v_ing_rec IN (
            SELECT i.name, i.stock_quantity, pi.quantity_used 
            FROM public.product_ingredients pi
            JOIN public.ingredients i ON i.id = pi.ingredient_id
            WHERE pi.product_id = v_prod_rec.id
          ) LOOP
            v_required_stock := v_ing_rec.quantity_used * v_quantity;
            IF v_ing_rec.stock_quantity < v_required_stock THEN
              RAISE EXCEPTION 'Estoque insuficiente para o ingrediente % do produto %: disponível %, necessário %', v_ing_rec.name, v_prod_rec.name, v_ing_rec.stock_quantity, v_required_stock;
            END IF;
          END LOOP;
        END IF;
      END IF;
    END IF;
  END LOOP;

  -- SECOND PASS: CREATE THE MAIN ORDER
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
    'pending'
  )
  RETURNING id INTO v_order_id;

  -- THIRD PASS: INSERT ORDER ITEMS AND REDUCE STOCK
  FOR v_item IN SELECT * FROM jsonb_array_elements(_items)
  LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_quantity := (v_item->>'quantity')::integer;

    -- Insert order item
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
      v_product_id,
      v_item->>'product_name',
      v_quantity,
      (v_item->>'unit_price')::numeric,
      v_item->>'observation'
    );

    -- REDUCE STOCK
    IF v_product_id IS NOT NULL THEN
      SELECT * INTO v_prod_rec FROM public.products WHERE id = v_product_id;
      
      IF FOUND THEN
        IF v_prod_rec.stock_type = 'unit' THEN
          UPDATE public.products 
          SET stock_quantity = stock_quantity - v_quantity 
          WHERE id = v_prod_rec.id;
        ELSIF v_prod_rec.stock_type = 'ingredient' THEN
          FOR v_ing_rec IN (SELECT ingredient_id, quantity_used FROM public.product_ingredients WHERE product_id = v_prod_rec.id) LOOP
            UPDATE public.ingredients 
            SET stock_quantity = stock_quantity - (v_ing_rec.quantity_used * v_quantity)
            WHERE id = v_ing_rec.ingredient_id;
          END LOOP;
        END IF;
      END IF;
    END IF;
  END LOOP;

  RETURN v_order_id;
END;
$$;
