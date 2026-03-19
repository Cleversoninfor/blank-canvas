
-- 1. Add stock columns to products
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS stock_mode TEXT DEFAULT 'simple',
ADD COLUMN IF NOT EXISTS stock_quantity NUMERIC(10,3) DEFAULT 0,
ADD COLUMN IF NOT EXISTS min_stock NUMERIC(10,3) DEFAULT 0;

-- 2. Create ingredients table
CREATE TABLE IF NOT EXISTS public.ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    stock_quantity NUMERIC(10,3) NOT NULL DEFAULT 0,
    unit TEXT NOT NULL DEFAULT 'un', -- 'kg', 'g', 'L', 'ml', 'un'
    min_stock NUMERIC(10,3) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for ingredients
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read ingredients"
ON public.ingredients FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to manage ingredients"
ON public.ingredients FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 3. Create product_ingredients (Composition)
CREATE TABLE IF NOT EXISTS public.product_ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
    quantity_used NUMERIC(10,3) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(product_id, ingredient_id)
);

-- Enable RLS for product_ingredients
ALTER TABLE public.product_ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read product_ingredients"
ON public.product_ingredients FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to manage product_ingredients"
ON public.product_ingredients FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 4. Add product_id to order_items for better tracking
ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.products(id) ON DELETE SET NULL;

-- 5. Updated function for order creation with stock validation and reduction
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
        -- Check simple stock
        IF _prod_rec.stock_mode = 'simple' THEN
          IF _prod_rec.stock_quantity < _quantity THEN
            RAISE EXCEPTION 'Estoque insuficiente para o produto %: disponível %, solicitado %', _prod_rec.name, _prod_rec.stock_quantity, _quantity;
          END IF;
        
        -- Check ingredients stock
        ELSIF _prod_rec.stock_mode = 'ingredients' THEN
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
        IF _prod_rec.stock_mode = 'simple' THEN
          UPDATE products 
          SET stock_quantity = stock_quantity - _quantity 
          WHERE id = _prod_rec.id;
        ELSIF _prod_rec.stock_mode = 'ingredients' THEN
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

-- Trigger for updated_at on ingredients
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_ingredients_updated_at ON public.ingredients;
CREATE TRIGGER set_ingredients_updated_at
    BEFORE UPDATE ON public.ingredients
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
