-- Remove old order creation function if we need to recreate
DROP FUNCTION IF EXISTS public.create_order_with_items(text, text, text, text, text, numeric, text, jsonb, text, text, numeric, double precision, double precision);

-- Rename stock_mode to stock_type in products
DO $$
BEGIN
  IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name='products' and column_name='stock_mode') THEN
    ALTER TABLE public.products RENAME COLUMN stock_mode TO stock_type;
  END IF;
END $$;

-- Add unit column to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'un';

-- Update existing values
UPDATE public.products SET stock_type = 'unit' WHERE stock_type = 'simple' OR stock_type IS NULL OR stock_type = 'none';
UPDATE public.products SET stock_type = 'ingredient' WHERE stock_type = 'ingredients';

-- Add unit column to product_ingredients
ALTER TABLE public.product_ingredients ADD COLUMN IF NOT EXISTS unit TEXT;

-- Recreate the order creation function taking into account the new stock_type column
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
  _latitude double precision DEFAULT NULL,
  _longitude double precision DEFAULT NULL
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _order_id integer;
  _item jsonb;
  _product_id uuid;
  _quantity integer;
  _prod_rec record;
  _ing_rec record;
  _available_stock numeric;
  _required_stock numeric;
BEGIN
  -- FIRST PASS: VALIDATE STOCK
  FOR _item IN SELECT * FROM jsonb_array_elements(_items)
  LOOP
    _product_id := (_item->>'product_id')::uuid;
    _quantity := (_item->>'quantity')::integer;

    IF _product_id IS NOT NULL THEN
      SELECT * INTO _prod_rec FROM products WHERE id = _product_id;
      
      IF FOUND THEN
        -- Check unit stock
        IF _prod_rec.stock_type = 'unit' THEN
          IF _prod_rec.stock_quantity < _quantity THEN
            RAISE EXCEPTION 'Estoque insuficiente para o produto %: disponível %, solicitado %', _prod_rec.name, _prod_rec.stock_quantity, _quantity;
          END IF;
        
        -- Check ingredient stock
        ELSIF _prod_rec.stock_type = 'ingredient' THEN
          FOR _ing_rec IN (
            SELECT i.name, i.stock_quantity, pi.quantity_used 
            FROM product_ingredients pi
            JOIN ingredients i ON i.id = pi.ingredient_id
            WHERE pi.product_id = _prod_rec.id
          ) LOOP
            _required_stock := _ing_rec.quantity_used * _quantity;
            IF _ing_rec.stock_quantity < _required_stock THEN
              RAISE EXCEPTION 'Estoque insuficiente para o ingrediente % do produto %: disponível %, necessário %', _ing_rec.name, _prod_rec.name, _ing_rec.stock_quantity, _required_stock;
            END IF;
          END LOOP;
        END IF;
      END IF;
    END IF;
  END LOOP;

  -- SECOND PASS: CREATE ORDER AND REDUCE STOCK
  INSERT INTO public.orders (
    customer_name, customer_phone, address_street, address_number,
    address_neighborhood, address_complement, address_reference,
    total_amount, payment_method, change_for, latitude, longitude, status
  ) VALUES (
    _customer_name, _customer_phone, _address_street, _address_number,
    _address_neighborhood, _address_complement, _address_reference,
    _total_amount, _payment_method, _change_for, _latitude, _longitude, 'pending'
  ) RETURNING id INTO _order_id;

  FOR _item IN SELECT * FROM jsonb_array_elements(_items)
  LOOP
    _product_id := (_item->>'product_id')::uuid;
    _quantity := (_item->>'quantity')::integer;

    INSERT INTO public.order_items (order_id, product_id, product_name, quantity, unit_price, observation)
    VALUES (
      _order_id,
      _product_id,
      _item->>'product_name',
      _quantity,
      (_item->>'unit_price')::numeric,
      _item->>'observation'
    );

    -- REDUCE STOCK
    IF _product_id IS NOT NULL THEN
      SELECT * INTO _prod_rec FROM products WHERE id = _product_id;
      
      IF FOUND THEN
        IF _prod_rec.stock_type = 'unit' THEN
          UPDATE products 
          SET stock_quantity = stock_quantity - _quantity 
          WHERE id = _prod_rec.id;
        ELSIF _prod_rec.stock_type = 'ingredient' THEN
          FOR _ing_rec IN (SELECT ingredient_id, quantity_used FROM product_ingredients WHERE product_id = _prod_rec.id) LOOP
            UPDATE ingredients 
            SET stock_quantity = stock_quantity - (_ing_rec.quantity_used * _quantity)
            WHERE id = _ing_rec.ingredient_id;
          END LOOP;
        END IF;
      END IF;
    END IF;
  END LOOP;

  RETURN _order_id;
END;
$$;
